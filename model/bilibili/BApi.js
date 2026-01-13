import fetch from "node-fetch"

class BApi {
  async getRoomInfo(room_id) {
    try {
      const res = await (await fetch(`https://api.live.bilibili.com/room/v1/Room/get_info?room_id=${room_id}`)).json()
      if (res.code !== 0) {
        logger.error(res.msg || res.message)
        return false
      }
      const { uid, online, live_status, user_cover, live_time, title } = res.data
      return { uid, room_id, online, live_status, user_cover, live_time, title }
    } catch (err) {
      logger.error('获取房间信息失败', err)
      return false
    }
  }
  
  async getRoomInfobyUid(uid) {
    return (await this.getRoomInfobyUids([uid]))?.[uid]
  }
  
  async getRoomInfobyUids(uids) {
    try {
      const res = await (await fetch('https://api.live.bilibili.com/room/v1/Room/get_status_info_by_uids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 'uids': uids.map(item => parseInt(item)) })
      })).json()
      if (res.code !== 0) {
        logger.error(res.msg || res.message)
        return false
      }
      return res.data
    } catch (err) {
      logger.error('批量获取房间信息失败', err)
      return false
    }
  }
}

export default new BApi()