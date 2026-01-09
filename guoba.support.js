import Cfg from './model/Cfg.js'

export function supportGuoba() {
  return {
    pluginInfo: {
      name: 'bililivePush-plugin',
      title: 'bililivePush-plugin',
      author: '@QingYingX',
      authorLink: 'https://github.com/QingYingX',
      link: 'https://github.com/QingYingX-Bot/bililivePush-plugin',
      isV3: true,
      isV2: false,
      description: '当然是推送b站直播啦',
      icon: 'mdi:stove',
      iconColor: '#6bb9dd',
    },
    configInfo: {
      schemas: [{
        field: 'user.sleep',
        label: '群发间隔',
        bottomHelpMessage: '推送给多个群时间隔的时间(单位秒)',
        component: "InputNumber",
        componentProps: {
          placeholder: "请输入间隔时间"
        }
      }, {
        field: 'user.endPush',
        label: '下播推送',
        bottomHelpMessage: '是否推送下播信息',
        component: "Switch"
      }, {
        field: 'user.forward',
        label: '使用转发推送',
        bottomHelpMessage: '使用合并转发推送消息',
        component: "Switch"
      }, {
        field: 'user.htmlTemplate',
        label: '使用HTML模板',
        bottomHelpMessage: '使用HTML模板渲染推送消息（需要支持runtime.render）',
        component: "Switch"
      }, {
        field: 'rePush',
        label: '改标题二次推送',
        bottomHelpMessage: '当直播间标题被更改时，再次推送一遍',
        component: "Switch"
      }],
      getConfigData() {
        return Cfg.getAll()
      },
      setConfigData(data, {
        Result
      }) {
        for (let [keyPath, value] of Object.entries(data)) {
          Cfg._set(keyPath, value)
        }
        Cfg.save()
        return Result.ok({}, '保存成功~')
      },
    },
  }
}