import Bili from '../model/bilibili.js'
import moment from 'moment'
import common from '../../../lib/common/common.js'
import Cfg from '../model/Cfg.js'
import render from '../model/render.js'

export default class bilibili extends plugin {
  constructor(e) {
    // 从配置读取 trigger，默认为空字符串（只有 #）
    const trigger = Cfg.get('trigger', '')
    // 构建命令前缀正则：如果 trigger 为空，就是 #，否则是 #+trigger
    const prefix = trigger ? `#${trigger}` : '#'
    
    super({
      name: 'bilibili',
      priority: -114514,
      rule: [{
          reg: `^${prefix}(全体|匿名)?订阅直播间`,
          fnc: 'setLivePush'
        },
        {
          reg: `^${prefix}(全体|匿名)?取消订阅直播间`,
          fnc: 'delLivePush'
        },
        {
          reg: `^${prefix}(全体|匿名)?订阅(up|UP|Up|uid:|UID:)+`,
          fnc: 'setLivePushByUid'
        },
        {
          reg: `^${prefix}(全体|匿名)?取消订阅(up|UP|Up|uid:|UID:)+`,
          fnc: 'delLivePushByUid'
        },
        {
          reg: `^${prefix}(本?群|我的?)?订阅(列表|list)?`,
          fnc: 'listLivePush'
        }
      ]
    })
    this.task = {
        name: 'bililivePush',
        fnc: () => this.livepush(),
        cron: '10 */1 * * * *',
        log: false
      },
      this.e = e
  }

  async listLivePush(e) {
    let ret, key
    let msg = []
    if (/.*群.*/.test(e.msg)) {
      ret = Bili.listLiveData({
        group_id: e.group_id
      })
      key = 'users'
    } else if (/.*我.*/.test(e.msg)) {
      ret = Bili.listLiveData({
        user_id: e.user_id
      })
      key = 'groups'
    } else {
      const em = (command) => Bot.em("message", {
        self_id: this.e.self_id,
        message_id: this.e.message_id,
        user_id: e.user_id,
        sender: e.sender,
        reply: this.reply.bind(this),
        post_type: "message",
        message_type: 'group',
        sub_type: 'normal',
        message: [{
          type: "text",
          text: command
        }],
        raw_message: command,
      })
      em("#本群订阅列表")
      em("#我的订阅列表")
      return true
    }
    ret = await Bili.setRoomInfo(ret)
    for (const {
        uid,
        uname,
        face,
        ...item
      }
      of ret) {
      msg.push([
        segment.image(face),
        `昵称: ${uname}\n`,
        `用户uid: ${uid}\n`,
        `订阅${key}:\n${item[key].map(item => (item == 99999) ? '匿名' : item).join('\n')}`
      ])
    }
    msg = !!msg.length ? await common.makeForwardMsg(e, msg) : '无'
    e.reply(msg)
    return true
  }

  async setLivePush(e) {
    if (/.*全体.*/.test(e.msg)) e.user_id = 0
    if (/.*匿名.*/.test(e.msg)) e.user_id = 99999
    let room_id = /[0-9]+/.exec(e.msg)[0]
    if (isNaN(room_id)) {
      return e.reply("直播间id格式不对！请输入数字！")
    }
    let {
      uid,
      face,
      uname
    } = await Bili.getRoomInfo(room_id)
    if (!uid) {
      return e.reply("不存在该直播间！")
    }
    let data = {
      room_id,
      uid,
      group_id: e.group_id,
      user_id: e.user_id
    }
    Bili.setLiveData(data)
    return e.reply([segment.image(face), `${uname}直播间订阅成功！`])
  }

  async delLivePush(e) {
    if (/.*全体.*/.test(e.msg)) e.user_id = 0
    if (/.*匿名.*/.test(e.msg)) e.user_id = 99999
    let room_id = /[0-9]+/.exec(e.msg)[0]
    if (isNaN(room_id)) {
      return e.reply("直播间id格式不对！请输入数字！")
    }
    let data = Bili.getLiveData()?.data
    let {
      uid
    } = await Bili.getRoomInfo(room_id)
    if (data[uid]?.group[e.group_id]?.filter(i => i == 99999).length == 1) e.user_id = 99999
    if (data[uid]?.group[e.group_id]?.filter(i => i == 0).length == 1) e.user_id = 0
    if (!data[uid]?.group[e.group_id]?.includes(e.user_id)) {
      return e.reply("你还没有订阅该直播间！")
    }

    Bili.delLiveData({
      uid,
      group_id: e.group_id,
      user_id: e.user_id
    })
    return e.reply("取消直播间订阅成功！")
  }

  async setLivePushByUid(e) {
    if (/.*全体.*/.test(e.msg)) e.user_id = 0
    if (/.*匿名.*/.test(e.msg)) e.user_id = 99999
    let uid = /[0-9]+/.exec(e.msg)[0]
    if (isNaN(uid)) {
      return e.reply("uid格式不对！请输入数字！")
    }
    let {
      room_id,
      face,
      uname
    } = await Bili.getRoomInfoByUid(uid)
    if (!room_id) {
      return e.reply("不存在该直播间！")
    }
    let data = {
      room_id,
      uid,
      group_id: e.group_id,
      user_id: e.user_id
    }
    Bili.setLiveData(data)
    return e.reply([segment.image(face), `${uname}直播间订阅成功！`])
  }

  async delLivePushByUid(e) {
    if (/.*全体.*/.test(e.msg)) e.user_id = 0
    if (/.*匿名.*/.test(e.msg)) e.user_id = 99999
    let uid = /[0-9]+/.exec(e.msg)[0]
    if (isNaN(uid)) {
      return e.reply("uid格式不对！请输入数字！")
    }
    let data = Bili.getLiveData()?.data
    if (data[uid]?.group[e.group_id]?.filter(i => i == 99999).length == 1) e.user_id = 99999
    if (data[uid]?.group[e.group_id]?.filter(i => i == 0).length == 1) e.user_id = 0
    if (!data[uid]?.group[e.group_id]?.includes(e.user_id)) {
      return e.reply("你还没有订阅该直播间！")
    }

    Bili.delLiveData({
      uid,
      group_id: e.group_id,
      user_id: e.user_id
    })
    return e.reply("取消直播间订阅成功！")
  }

  async livepush(e) {
    let liveData = Object.values(Bili.getLiveData()?.data)
    liveData = await Bili.setRoomInfo(liveData)

    // 创建临时事件对象用于渲染（如果定时任务调用时没有 e）
    let renderE = e
    if (!renderE || !renderE.runtime) {
      try {
        // 尝试导入 Runtime 并初始化
        const Runtime = (await import('../../../lib/plugins/runtime.js')).default
        const tempE = {}
        await Runtime.init(tempE)
        renderE = tempE
      } catch (err) {
        // 如果无法初始化 runtime，renderE 保持为 null，将使用默认文本格式
        renderE = null
      }
    }

    const sendLiveStartMessage = async (groupId, userIds, roomInfo, renderE) => {
      const {
        room_id,
        cover_from_user,
        uname,
        title,
        uid,
        online,
        live_time,
        area_v2_parent_name,
        area_v2_name,
        face
      } = roomInfo
      const userMentions = userIds.filter(item => item != 99999).map(item => segment.at(item == 0 ? 'all' : item))
      
      // 检查是否使用 HTML 模板
      const useHtmlTemplate = Cfg.get('user.htmlTemplate', false)
      
      if (useHtmlTemplate && renderE?.runtime) {
        try {
          // 使用 HTML 模板渲染
          const templateData = {
            room_id,
            cover_from_user,
            uname,
            title,
            uid,
            online,
            live_time: moment(live_time).format('YYYY-MM-DD HH:mm:ss'),
            area_v2_parent_name,
            area_v2_name,
            face
          }
          const img = await render('template/live_start', templateData, { e: renderE, retType: 'base64' })
          if (img) {
            const message = [
              ...userMentions,
              segment.image(`base64://${img}`)
            ]
            Bot.pickGroup(Number(groupId)).sendMsg(message)
            return
          }
        } catch (err) {
          logger.error('HTML模板渲染失败，使用默认格式', err)
        }
      }
      
      // 默认文本格式
      const message = [
        ...userMentions,
        segment.image(cover_from_user),
        `昵称: ${uname}\n`,
        `用户uid: ${uid}\n`,
        `标题: ${title}\n`,
        `分区: ${area_v2_parent_name}-${area_v2_name}\n`,
        `历史人次: ${online}\n`,
        `开播时间: ${moment(live_time).format('YYYY-MM-DD HH:mm:ss')}\n`,
        `直播间地址: https://live.bilibili.com/${room_id}`
      ]
      if (Cfg.get('user.forward', false)) {
        Bot.pickGroup(Number(groupId)).sendMsg(await common.makeForwardMsg(renderE, [message]))
        Bot.pickGroup(Number(groupId)).sendMsg(userMentions)
      } else Bot.pickGroup(Number(groupId)).sendMsg(message)
    }

    const sendLiveEndMessage = async (groupId, roomInfo, liveDuration, renderE) => {
      const {
        cover_from_user
      } = roomInfo
      
      // 检查是否使用 HTML 模板
      const useHtmlTemplate = Cfg.get('user.htmlTemplate', false)
      
      if (useHtmlTemplate && renderE?.runtime) {
        try {
          // 使用 HTML 模板渲染
          const templateData = {
            cover_from_user,
            liveDuration
          }
          const img = await render('template/live_end', templateData, { e: renderE, retType: 'base64' })
          if (img) {
            const message = [
              segment.image(`base64://${img}`)
            ]
            Bot.pickGroup(Number(groupId)).sendMsg(message)
            return
          }
        } catch (err) {
          logger.error('HTML模板渲染失败，使用默认格式', err)
        }
      }
      
      // 默认文本格式
      const message = [
        segment.image(cover_from_user),
        '主播下播la~~~~\n',
        `本次直播时长: ${liveDuration}`
      ]
      Bot.pickGroup(Number(groupId)).sendMsg(message)
    }

    const msleep = () => {
      return new Promise(resolve => setTimeout(resolve, Cfg.get('user.sleep', 0) * 1000))
    }
    
    const rePush = Cfg.get('rePush', false)

    for (const {
        group,
        ...roomInfo
      } of liveData) {
      roomInfo.live_time *= 1000
      const {
        room_id,
        live_status,
        title,
        area_v2_parent_name,
        area_v2_name
      } = roomInfo
      const redisKey = `bililive_${room_id}`
      const data = await redis.get(redisKey)
      const key = `${title}-${area_v2_parent_name}-${area_v2_name}`

      if (live_status === 1 && (!data || (rePush && key !== data.key))) {
        const {
          live_time
        } = roomInfo
        redis.set(redisKey, JSON.stringify({
          live_time,
          key
        }))

        for (const [groupId, userIds] of Object.entries(group)) {
          sendLiveStartMessage(groupId, userIds, roomInfo, renderE)
          await msleep()
        }
      } else if (live_status != 1 && data) {
        redis.del(redisKey)
        if (!Cfg.get('user.endPush', true)) return

        const {
          live_time
        } = JSON.parse(data)
        const liveDuration = this.getDealTime(moment(live_time), moment())
        for (const [groupId] of Object.entries(group)) {
          sendLiveEndMessage(groupId, roomInfo, liveDuration, renderE)
          await msleep()
        }
      }
    }
  }

  getDealTime(stime, etime) {
    let str = ''
    let dura = etime.format('x') - stime.format('x')
    let tempTime = moment.duration(dura)
    str += tempTime.years() ? tempTime.years() + '年' : ''
    str += tempTime.months() ? tempTime.months() + '月' : ''
    str += tempTime.days() ? tempTime.days() + '日' : ''
    str += tempTime.hours() ? tempTime.hours() + '小时' : ''
    str += tempTime.minutes() ? tempTime.minutes() + '分钟' : ''
    if (dura <= 5 * 60 * 1000) str += `\n(没关系的, ${str}也很厉害了)`
    return str
  }
}