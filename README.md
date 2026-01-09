## bililivePush-plugin

### 安装
```
cd plugins
git clone https://github.com/QingYingX-Bot/bililivePush-plugin
cd ..
pnpm install
```

### 使用
|指令|功能|
|-------|-------|
|#推送帮助|换个方式展示这些功能|
|#(订阅/取消订阅)直播间+直播间room_id|订阅/取消订阅指定直播间|
|#(订阅/取消订阅)UP+UP的uid|订阅/取消订阅指定UP主(推荐使用)|
|#(我的/本群)订阅列表|查看订阅列表|
|#推送插件更新|更新插件|
|Tips|如需艾特全体，指令前加"全体"二字|
|Tips|如不需艾特自己，指令前加"匿名"二字|
|Tips|命令前缀可通过配置项`trigger`自定义（默认为`#`）|

### 配置说明
- `trigger`: 命令前缀自定义（默认为空，即使用`#`）。例如设置为`xx`，则命令为`#xx订阅UP123456`
- `user.htmlTemplate`: 是否使用HTML模板推送（默认`true`）。启用后将使用精美的HTML模板进行推送
- `user.endPush`: 是否推送下播消息（默认`true`）
- `user.forward`: 是否使用合并转发（默认`false`）
- `user.sleep`: 推送间隔时间，单位秒（默认`0`）
- `rePush`: 是否允许重复推送（默认`false`）

### 例子
```
#订阅直播间114514
#全体订阅UP1919810
#匿名订阅UP66666
#全体取消订阅12345
#取消订阅13579
#我的订阅列表
```

### 其他
有问题提issue  
提交发pull request  
最后希望能给项目点个star~

#### 项目链接
听说Stars越多，更新越快哦~  
github：[QingYingX](https://github.com/QingYingX)  
gitee：[QingYingX](https://gitee.com/QingYingX)