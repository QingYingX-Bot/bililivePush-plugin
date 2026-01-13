import Data from './Data.js'
import Bili from './bilibili.js'
import {
  pluginName
} from "../config/constant.js"

const version = 1

const upgrade = async () => {
  const data = Data.readJSON('bilibili/live') || {}
  if (!data || data.version >= version) return
  
  logger.warn(`[${pluginName}] 正在尝试更新数据文件`)
  Data.writeJSON('bilibili/live.backup', data)
  
  if (data.version === undefined) {
    const newData = { data: {}, version }
    for (const item of Object.values(data)) {
      const { uid } = await Bili.BApi.getRoomInfo(item.room_id) || {}
      if (uid) {
        newData.data[uid] = { uid, room_id: item.room_id, group: item.group }
      }
    }
    Data.writeJSON('bilibili/live', newData)
  }
  
  logger.mark(`[${pluginName}] 更新数据文件完成`)
}

export default upgrade