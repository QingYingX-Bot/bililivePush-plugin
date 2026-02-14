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
        },
        {
          reg: `^${prefix}测试推送(开播|下播)?`,
          fnc: 'testPush'
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

  // 处理用户ID（全体/匿名）
  _processUserId(e) {
    if (/.*全体.*/.test(e.msg)) e.user_id = 0
    if (/.*匿名.*/.test(e.msg)) e.user_id = 99999
  }

  // 初始化 renderE 对象
  async _initRenderE(e) {
    if (e?.runtime) return e
    try {
      const Runtime = (await import('../../../lib/plugins/runtime.js')).default
      const tempE = { reply: async () => false }
      await Runtime.init(tempE)
      return tempE
    } catch (err) {
      return null
    }
  }

  // 处理 HTML 模板渲染的图片
  async _processHtmlTemplate(templatePath, templateData, renderE, userMentions = []) {
    if (!Cfg.get('user.htmlTemplate', false) || !renderE?.runtime) {
      return null
    }
    try {
      const img = await render(templatePath, templateData, { e: renderE, retType: 'base64' })
      if (!img) {
        logger.warn('HTML模板渲染返回空值')
        return null
      }
      // 从图片数据中提取 base64 字符串
      let imgBase64
      if (Buffer.isBuffer(img)) {
        imgBase64 = img.toString('base64')
      } else if (Array.isArray(img) && img.length > 0) {
        imgBase64 = Buffer.isBuffer(img[0]) ? img[0].toString('base64') : img[0]
      } else if (typeof img === 'string') {
        imgBase64 = img.startsWith('base64://') ? img.substring(9) : img
      } else if (typeof img === 'object' && img !== null) {
        // 处理 segment.image 对象
        if (img.type === 'image') {
          const fileData = img.data?.file || img.file || img.data
          if (fileData) {
            if (typeof fileData === 'string' && fileData.startsWith('base64://')) {
              imgBase64 = fileData.substring(9)
            } else if (Buffer.isBuffer(fileData)) {
              imgBase64 = fileData.toString('base64')
            } else if (typeof fileData === 'string') {
              imgBase64 = fileData
            } else {
              logger.error('segment.image 对象的 file 字段格式异常', typeof fileData)
              throw new Error('图片数据格式错误：无法从 segment.image 对象中提取数据')
            }
          } else {
            logger.error('segment.image 对象缺少 file 字段', Object.keys(img))
            throw new Error('图片数据格式错误：segment.image 对象缺少 file 字段')
          }
        } else {
          // 尝试从其他字段提取
          const fields = ['base64', 'data', 'image', 'buffer', 'file']
          for (const field of fields) {
            if (img[field]) {
              const data = img[field]
              imgBase64 = Buffer.isBuffer(data) ? data.toString('base64') : data
              break
            }
          }
          if (!imgBase64) {
            logger.error('HTML模板渲染返回了无法处理的对象类型', Object.keys(img))
            throw new Error('图片数据格式错误：无法从对象中提取base64数据')
          }
        }
      } else {
        logger.error('HTML模板渲染返回了意外的数据类型', typeof img, img)
        throw new Error('图片数据格式错误')
      }
      return [
        ...userMentions,
        segment.image(`base64://${imgBase64}`)
      ]
    } catch (err) {
      logger.error('HTML模板渲染失败', err)
      return null
    }
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
      e.reply("请使用：#本群订阅列表 或 #我的订阅列表")
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
    this._processUserId(e)
    const room_id = /[0-9]+/.exec(e.msg)?.[0]
    if (!room_id || isNaN(room_id)) {
      return e.reply("直播间id格式不对！请输入数字！")
    }
    const { uid, face, uname } = await Bili.getRoomInfo(room_id)
    if (!uid) {
      return e.reply("不存在该直播间！")
    }
    Bili.setLiveData({ room_id, uid, group_id: e.group_id, user_id: e.user_id })
    return e.reply([segment.image(face), `${uname}直播间订阅成功！`])
  }

  async delLivePush(e) {
    this._processUserId(e)
    const room_id = /[0-9]+/.exec(e.msg)?.[0]
    if (!room_id || isNaN(room_id)) {
      return e.reply("直播间id格式不对！请输入数字！")
    }
    const data = Bili.getLiveData()?.data
    const { uid } = await Bili.getRoomInfo(room_id)
    if (!uid) return e.reply("不存在该直播间！")
    const group = data[uid]?.group[e.group_id]
    if (group?.filter(i => i == 99999).length == 1) e.user_id = 99999
    if (group?.filter(i => i == 0).length == 1) e.user_id = 0
    if (!group?.includes(e.user_id)) {
      return e.reply("你还没有订阅该直播间！")
    }
    Bili.delLiveData({ uid, group_id: e.group_id, user_id: e.user_id })
    return e.reply("取消直播间订阅成功！")
  }

  async setLivePushByUid(e) {
    this._processUserId(e)
    const uid = /[0-9]+/.exec(e.msg)?.[0]
    if (!uid || isNaN(uid)) {
      return e.reply("uid格式不对！请输入数字！")
    }
    const { room_id, face, uname } = await Bili.getRoomInfoByUid(uid)
    if (!room_id) {
      return e.reply("不存在该直播间！")
    }
    Bili.setLiveData({ room_id, uid, group_id: e.group_id, user_id: e.user_id })
    return e.reply([segment.image(face), `${uname}直播间订阅成功！`])
  }

  async delLivePushByUid(e) {
    this._processUserId(e)
    const uid = /[0-9]+/.exec(e.msg)?.[0]
    if (!uid || isNaN(uid)) {
      return e.reply("uid格式不对！请输入数字！")
    }
    const data = Bili.getLiveData()?.data
    const group = data[uid]?.group[e.group_id]
    if (group?.filter(i => i == 99999).length == 1) e.user_id = 99999
    if (group?.filter(i => i == 0).length == 1) e.user_id = 0
    if (!group?.includes(e.user_id)) {
      return e.reply("你还没有订阅该直播间！")
    }
    Bili.delLiveData({ uid, group_id: e.group_id, user_id: e.user_id })
    return e.reply("取消直播间订阅成功！")
  }

  // 发送开播消息
  async sendLiveStartMessage(groupId, userIds, roomInfo, renderE) {
    const { room_id, cover_from_user, uname, title, uid, online, live_time, area_v2_parent_name, area_v2_name, face } = roomInfo
    const userMentions = userIds.filter(item => item != 99999).map(item => segment.at(item == 0 ? 'all' : item))
    
    // 尝试使用 HTML 模板
    const coverImage = cover_from_user || roomInfo.user_cover
    const templateData = {
      room_id, cover_from_user: coverImage, uname, title, uid, online,
      live_time: moment(live_time).format('YYYY-MM-DD HH:mm:ss'),
      area_v2_parent_name, area_v2_name, face
    }
    const htmlMessage = await this._processHtmlTemplate('template/live_start', templateData, renderE, userMentions)
    if (htmlMessage) {
      // 在图片消息后附带直播间链接，合并为一条消息发送
      htmlMessage.push(`\n直播间地址: https://live.bilibili.com/${room_id}`)
      Bot.pickGroup(Number(groupId)).sendMsg(htmlMessage)
      return
    }
    
    // 默认文本格式
    const message = [
      ...userMentions,
      ...(coverImage ? [segment.image(coverImage)] : []),
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
    } else {
      Bot.pickGroup(Number(groupId)).sendMsg(message)
    }
  }

  // 发送下播消息
  async sendLiveEndMessage(groupId, roomInfo, liveDuration, renderE) {
    const { cover_from_user, user_cover, room_id } = roomInfo
    
    // 尝试使用 HTML 模板
    const coverImage = cover_from_user || user_cover
    const templateData = { cover_from_user: coverImage, liveDuration }
    const htmlMessage = await this._processHtmlTemplate('template/live_end', templateData, renderE)
    if (htmlMessage) {
      // 在图片消息后附带直播间链接，合并为一条消息发送
      htmlMessage.push(`\n直播间地址: https://live.bilibili.com/${room_id}`)
      Bot.pickGroup(Number(groupId)).sendMsg(htmlMessage)
      return
    }
    
    // 默认文本格式
    const message = [
      ...(coverImage ? [segment.image(coverImage)] : []),
      '主播下播la~~~~\n',
      `本次直播时长: ${liveDuration}`
    ]
    Bot.pickGroup(Number(groupId)).sendMsg(message)
  }

  // 测试推送功能
  async testPush(e) {
    const msg = e.msg.trim()
    const pushType = msg.includes('下播') ? 'end' : 'start'
    
    // 提取房间ID或UID
    const roomIdMatch = /(?:直播间|room|房间|room_id)[：:_]*(\d+)/i.exec(msg)
    const uidMatch = /(?:uid|up)[：:]*(\d+)/i.exec(msg)
    let room_id = roomIdMatch?.[1]
    let uid = uidMatch?.[1]
    
    // 如果没有指定，从订阅列表获取第一个
    if (!room_id && !uid) {
      const liveData = Bili.getLiveData()?.data
      if (liveData && Object.keys(liveData).length > 0) {
        const firstUid = Object.keys(liveData)[0]
        uid = firstUid
        room_id = liveData[firstUid].room_id
      } else {
        return e.reply('请指定要测试的房间ID或UID，格式：\n#测试推送开播 直播间123456\n#测试推送下播 uid:123456')
      }
    }
    
    try {
      // 获取并合并房间信息
      const basicInfo = room_id ? await Bili.getRoomInfo(room_id) : await Bili.getRoomInfoByUid(uid)
      if (!basicInfo || (!basicInfo.uid && !uid)) {
        return e.reply(`获取房间信息失败，${room_id ? `房间ID: ${room_id}` : `UID: ${uid}`}`)
      }
      const targetUid = uid || basicInfo.uid
      const fullInfo = await Bili.BApi.getRoomInfobyUids([targetUid])
      let roomInfo
      if (fullInfo?.[targetUid]) {
        roomInfo = {
          ...basicInfo,
          ...fullInfo[targetUid],
          cover_from_user: fullInfo[targetUid].cover_from_user || basicInfo.user_cover,
          user_cover: basicInfo.user_cover || fullInfo[targetUid].cover_from_user
        }
      } else {
        roomInfo = basicInfo
      }
      
      // 确保必要字段存在
      if (!roomInfo.cover_from_user && roomInfo.user_cover) {
        roomInfo.cover_from_user = roomInfo.user_cover
      }
      roomInfo.live_time = roomInfo.live_time || Date.now()
      roomInfo.area_v2_parent_name = roomInfo.area_v2_parent_name || '测试分区'
      roomInfo.area_v2_name = roomInfo.area_v2_name || '测试子分区'
      
      const renderE = await this._initRenderE(e)
      const groupId = e.group_id
      const userIds = [e.user_id]
      
      if (pushType === 'start') {
        await this.sendLiveStartMessage(groupId, userIds, roomInfo, renderE)
        return e.reply('测试开播推送已发送')
      } else {
        await this.sendLiveEndMessage(groupId, roomInfo, '1小时30分钟', renderE)
        return e.reply('测试下播推送已发送')
      }
    } catch (err) {
      logger.error('测试推送失败', err)
      return e.reply(`测试推送失败: ${err.message}`)
    }
  }

  async livepush(e) {
    const liveData = await Bili.setRoomInfo(Object.values(Bili.getLiveData()?.data || {}))
    const renderE = await this._initRenderE(e)
    const sleep = Cfg.get('user.sleep', 0) * 1000
    const rePush = Cfg.get('rePush', false)
    const msleep = () => sleep > 0 ? new Promise(resolve => setTimeout(resolve, sleep)) : Promise.resolve()

    for (const { group, ...roomInfo } of liveData) {
      roomInfo.live_time *= 1000
      const { room_id, live_status, title, area_v2_parent_name, area_v2_name } = roomInfo
      const redisKey = `bililive_${room_id}`
      const cached = await redis.get(redisKey)
      const key = `${title}-${area_v2_parent_name}-${area_v2_name}`

      if (live_status === 1 && (!cached || (rePush && key !== JSON.parse(cached).key))) {
        await redis.set(redisKey, JSON.stringify({ live_time: roomInfo.live_time, key }))
        for (const [groupId, userIds] of Object.entries(group)) {
          await this.sendLiveStartMessage(groupId, userIds, roomInfo, renderE)
          await msleep()
        }
      } else if (live_status != 1 && cached) {
        await redis.del(redisKey)
        if (!Cfg.get('user.endPush', true)) continue
        const { live_time } = JSON.parse(cached)
        const liveDuration = this.getDealTime(moment(live_time), moment())
        for (const [groupId] of Object.entries(group)) {
          await this.sendLiveEndMessage(groupId, roomInfo, liveDuration, renderE)
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