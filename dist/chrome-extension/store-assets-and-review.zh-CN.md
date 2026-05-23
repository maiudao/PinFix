# PinFix 上架素材与审核说明

## 商店截图建议

建议准备 5 张截图，尺寸按 Chrome Web Store 当前要求导出：

1. 普通网页上开启 PinFix，小点点和工具栏清楚可见。
2. 给网页区域添加编号标注，并显示备注输入。
3. 复制后的 Markdown 修改说明预览。
4. 隐私遮挡和框选截图结果。
5. 设置页，展示颜色、线宽、标签样式、小点点位置和本地数据清理。

截图不要使用包含真实密码、订单、银行卡、密钥或私人聊天的网页。

## 隐私政策链接

隐私政策正文已放在：

```text
privacy-policy.zh-CN.md
```

插件内可读页面是：

```text
privacy.html
```

正式上架时，需要把这份内容发布到一个公开可访问的网址，然后填入 Chrome Web Store 后台。

## 支持链接

如果还没有独立网站，第一版可以把支持链接指向项目主页、GitHub Issues 或你准备的帮助页面。
支持作者页面是插件内部页面，不建议直接作为商店的唯一支持链接。

## 审核测试账号

PinFix 第一版不需要账号，不需要测试账号。

## 自动显示入口权限

PinFix 默认不读取所有网站。只有当用户在设置页把当前网站加入自动显示列表时，才会触发 Chrome 的网站授权弹窗。
内部保存的网站列表会保留完整地址来源，例如 `http://localhost:3000`，用于判断页面是否匹配；Chrome 授权规则会按域名申请。
当用户关闭自动显示，或移除不再使用的网站时，PinFix 会主动撤销对应的可选网站权限。

## 审核说明

可以在审核备注里写：

```text
PinFix only runs after the user clicks the extension action or grants optional site permission for auto-show. It stores annotations locally in chrome.storage.local and does not upload page content, screenshots, notes, or payment data.
```

补充说明：

- `chrome.storage.session` 只用于当前浏览器会话里记住最近可标注标签页，方便设置页继续操作原网页。
- 支持作者页面只读取插件包内 `assets/donate/` 下的本地图片，不加载远程支付脚本。
- 收款码图片建议使用 `png`、`jpg`、`jpeg` 或 `webp`，不要使用 SVG 或包含脚本的文件。
