import fs from 'node:fs'
import {
  pluginApplications
} from "./config/constant.js"

const files = fs.readdirSync(pluginApplications).filter(file => file.endsWith('.js'))

let ret = []

files.forEach((file) => {
  ret.push(import(`./apps/${file}`))
})

ret = await Promise.allSettled(ret)

let apps = {}
for (let i in files) {
  let name = files[i].replace('.js', '')

  if (ret[i].status !== 'fulfilled') {
    logger.error(`载入插件错误：${logger.red(name)}`)
    logger.error(ret[i].reason)
    continue
  }
  apps[name] = ret[i].value[Object.keys(ret[i].value)[0]]
}
logger.mark("bili直播推送插件载入完毕")
logger.mark("二改插件 原作者：https://gitee.com/HDTianRu")
logger.info(" ╱|、")
logger.info("(˚ˎ 。7")
logger.info(" |、˜〵")
logger.info("じしˍ,)ノ")
export { apps }