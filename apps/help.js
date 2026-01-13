import lodash from 'lodash'
import fs from 'fs'
import path from "path"
import render from "../model/render.js"
import HelpTheme from './help/HelpTheme.js'
import {
  helpCfg,
  helpList
} from "../config/help.js"
import {
  pluginResources
} from "../config/constant.js"

const helpPath = path.join(pluginResources, "help")

export class help extends plugin {
  constructor() {
    super({
      name: '[推送插件]帮助',
      dsc: '推送帮助',
      event: 'message',
      priority: 100,
      rule: [{
        reg: "^#?((B|b)ili)*(推送|(P|p)ush)(命令|帮助|菜单|help|说明|功能|指令|使用说明)$",
        fnc: 'help'
      }]
    })
  }

  async help (e) {
    const helpGroup = helpList
      .filter(group => !(group.auth === 'master' && !e.isMaster))
      .map(group => ({
        ...group,
        list: group.list.map(help => {
          const icon = help.icon * 1
          return {
            ...help,
            css: icon ? `background-position:-${((icon - 1) % 10) * 50}px -${Math.floor((icon - 1) / 10) * 50}px` : 'display:none'
          }
        })
      }))
    
    const themeData = await HelpTheme.getThemeData(helpCfg)
    return await render('help/index', {
      helpCfg,
      helpGroup,
      ...themeData,
      element: 'default'
    }, { e, scale: 1.2 })
  }
}