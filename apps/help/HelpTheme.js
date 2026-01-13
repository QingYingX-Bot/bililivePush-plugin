import lodash from 'lodash'
import fs from 'fs'
import path from "path"
import Data from '../../model/Data.js'
import {
  pluginResources
} from "../../config/constant.js"

let HelpTheme = {
  async getThemeCfg (theme, exclude) {
    const dirPath = path.join(pluginResources, "help/theme/")
    const names = fs.readdirSync(dirPath).filter(dir => fs.existsSync(`${dirPath}${dir}/main.png`))
    
    let ret = lodash.isArray(theme) ? lodash.intersection(theme, names) : theme === 'all' ? names : []
    if (lodash.isArray(exclude)) {
      ret = lodash.difference(ret, exclude)
    }
    if (ret.length === 0) {
      ret = ['default']
    }
    
    const name = lodash.sample(ret)
    const resPath = '{{_res_path}}/help/theme/'
    return {
      main: `${resPath}${name}/main.png`,
      bg: fs.existsSync(`${dirPath}${name}/bg.jpg`) ? `${resPath}${name}/bg.jpg` : `${resPath}default/bg.jpg`,
      style: (await Data.importModule(`resources/help/theme/${name}/config.js`)).style || {}
    }
  },
  async getThemeData (style) {
    const colCount = Math.min(5, Math.max(parseInt(style?.colCount) || 3, 2))
    const colWidth = Math.min(500, Math.max(100, parseInt(style?.colWidth) || 265))
    const width = Math.min(2500, Math.max(800, colCount * colWidth + 30))
    const theme = await HelpTheme.getThemeCfg(style.theme, style.themeExclude)
    const themeStyle = theme.style || {}
    
    const css = (sel, prop, key, def, fn) => {
      let val = Data.def(themeStyle[key], style[key], def)
      if (fn) val = fn(val)
      return `${sel}{${prop}:${val}}`
    }
    
    const styles = [
      `body{background-image:url(${theme.bg});width:${width}px;}`,
      `.container{background-image:url(${theme.main});width:${width}px;}`,
      `.help-table .td,.help-table .th{width:${100 / colCount}%}`,
      css('.help-title,.help-group', 'color', 'fontColor', '#ceb78b'),
      css('.help-title,.help-group', 'text-shadow', 'fontShadow', 'none'),
      css('.help-desc', 'color', 'descColor', '#eee'),
      css('.cont-box', 'background', 'contBgColor', 'rgba(43, 52, 61, 0.8)'),
      css('.cont-box', 'backdrop-filter', 'contBgBlur', 3, (n) => style.bgBlur === false ? 'none' : `blur(${n}px)`),
      css('.help-group', 'background', 'headerBgColor', 'rgba(34, 41, 51, .4)'),
      css('.help-table .tr:nth-child(odd)', 'background', 'rowBgColor1', 'rgba(34, 41, 51, .2)'),
      css('.help-table .tr:nth-child(even)', 'background', 'rowBgColor2', 'rgba(34, 41, 51, .4)')
    ]
    
    return {
      style: `<style>${styles.join('\n')}</style>`,
      colCount
    }
  }
}
export default HelpTheme