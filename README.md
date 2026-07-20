# Medical Records Management

加密病历管理网页。

- 打开网页后输入访问密码解锁。
- 初始病历数据已加密存放在 index.html 中。
- 后续增量数据放在 data/encrypted-updates.js 中，页面解锁后会自动合并。
- 新增、修改、删除会保存在当前浏览器。
- 重要修改后请使用网页右上角“备份数据”。


## 更新流程

1. 将新增病历整理成 JSON，或整理成 `window.medicalRecordUpdates = ...` 格式的本地草稿。
2. 用同一个访问密码加密更新文件：

```bash
node tools/encrypt-update.mjs update.json data/encrypted-updates.js
```

3. 只提交更新后的 `data/encrypted-updates.js`。通常不需要再改 `index.html`。
