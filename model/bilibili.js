import Data from './Data.js'
import BApi from './bilibili/BApi.js'

class Bili {
  constructor() {
    this.BApi = BApi
  }

  getLiveData() {
    return Data.readJSON('bilibili/live') || {}
  }

  setLiveData(data) {
    const fullData = this.getLiveData()
    const livedata = fullData?.data
    const {
      room_id,
      uid,
      group_id,
      user_id
    } = data
    if (!livedata[uid]) {
      livedata[uid] = {
        uid,
        room_id,
        group: {}
      }
    }
    if (!livedata[uid].group[group_id]) {
      livedata[uid].group[group_id] = []
    }
    if (!livedata[uid].group[group_id].includes(user_id)) {
      livedata[uid].group[group_id].push(user_id)
    }
    fullData.data = livedata
    Data.writeJSON('bilibili/live', fullData)
  }

  delLiveData(data) {
    const fullData = this.getLiveData()
    const livedata = fullData?.data
    const {
      uid,
      group_id,
      user_id
    } = data
    const group = livedata[uid].group
    if (group[group_id]) {
      group[group_id] = group[group_id].filter(id => id !== user_id)
      if (group[group_id].length === 0) {
        delete group[group_id]
      }
    }
    if (Object.keys(group).length === 0) {
      delete livedata[uid]
    }
    fullData.data = livedata
    Data.writeJSON('bilibili/live', fullData)
  }

  listLiveData(data) {
    const { group_id, user_id } = data
    const livedata = this.getLiveData()?.data || {}
    
    if (group_id) {
      return Object.values(livedata)
        .filter(({ group }) => group[group_id])
        .map(({ room_id, uid, group }) => ({ room_id, uid, users: group[group_id] }))
    }
    
    if (user_id) {
      return Object.values(livedata)
        .map(({ room_id, uid, group }) => {
          const groupsInRoom = Object.entries(group || {})
            .filter(([, users]) => users.includes(user_id))
            .map(([gid]) => gid)
          return groupsInRoom.length > 0 ? { room_id, uid, groups: groupsInRoom } : null
        })
        .filter(Boolean)
    }
    
    return false
  }

  async setRoomInfo(items) {
    const uids = items.map(item => item.uid)
    const ret = await BApi.getRoomInfobyUids(uids)
    return items.map(item => {
      const data = ret?.[item.uid]
      if (!data) return
      // 确保 cover_from_user 字段存在，如果不存在则使用 user_cover
      const result = { ...item, ...data }
      if (!result.cover_from_user && result.user_cover) {
        result.cover_from_user = result.user_cover
      }
      return result
    }).filter(item => !!item)
  }

  async getRoomInfo(room_id) {
    const basicInfo = await BApi.getRoomInfo(room_id)
    if (!basicInfo) return false
    const { uname, face } = await BApi.getRoomInfobyUid(basicInfo.uid) || {}
    return { ...basicInfo, uname, face }
  }

  async getRoomInfoByUid(uid) {
    const userInfo = await BApi.getRoomInfobyUid(uid)
    if (!userInfo?.room_id) return false
    const roomInfo = await BApi.getRoomInfo(userInfo.room_id)
    if (!roomInfo) return false
    return { ...roomInfo, ...userInfo }
  }
}

export default new Bili()