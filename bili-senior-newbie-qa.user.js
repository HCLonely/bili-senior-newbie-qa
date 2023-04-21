"use strict";
/* eslint-disable no-underscore-dangle, @typescript-eslint/no-empty-function */
// ==UserScript==
// @name         哔哩哔哩硬核会员搜题
// @namespace    bili-senior-newbie-qa
// @version      1.0
// @description  哔哩哔哩硬核会员搜题
// @author       HCLonely
// @include      *://www.bilibili.com/h5/senior-newbie/qa*
// @run-at       document-end
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @homepage     https://github.com/HCLonely/bili-senior-newbie-qa
// @require      https://cdn.jsdelivr.net/npm/sweetalert2@11
// @require      https://cdn.jsdelivr.net/npm/jquery@3.2.1/dist/jquery.slim.min.js
// @require      https://cdn.jsdelivr.net/npm/mammoth@1.4.21/mammoth.browser.min.js
// @require      https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js
// @require      https://cdn.jsdelivr.net/npm/tinykeys@1.4.0/dist/tinykeys.umd.min.js
// @require      https://cdn.jsdelivr.net/npm/js-md5@0.7.3/build/md5.min.js
// @license      Apache-2.0
// @connect      www.baidu.com
// @connect      www.sogou.com
// @connect      cn.bing.com
// @connect      www.google.com
// ==/UserScript==

(() => {
  window.onblur = () => { };
  window.onfocus = () => { };
  document.onfocusin = () => { };
  document.onfocusout = () => { };
  document._addEventListener = document.addEventListener;
  document.addEventListener = (...argv) => {
    if (['visibilitychange', 'mozvisibilitychange', 'webkitvisibilitychange', 'msvisibilitychange'].includes(argv[0])) {
      return;
    }
    document._addEventListener(...argv);
  };
  document._removeEventListener = document.removeEventListener;
  document.removeEventListener = (...argv) => {
    if (['visibilitychange', 'mozvisibilitychange', 'webkitvisibilitychange', 'msvisibilitychange'].includes(argv[0])) {
      return;
    }
    document._removeEventListener(...argv);
  };
  window.onload = () => {
    window.onblur = () => { };
    window.onfocus = () => { };
    document.onfocusin = () => { };
    document.onfocusout = () => { };
  };
  let { highLightAnswer, startShortcutKey } = GM_getValue('settings') || { highLightAnswer: true, startShortcutKey: 'Alt+N' };
  const start = async () => {
    let data;
    let imageData;
    let engine = 'baidu';
    const searchFromWebPage = (text, engine) => {
      switch (engine) {
        case 'baidu':
          window.open(`https://www.baidu.com/s?wd=${text}`, 'SearchResult', 'resize=yes,scrollbars=yes');
          break;
        case 'sougou':
          window.open(`https://www.sogou.com/web?query=${text}`, 'SearchResult', 'resize=yes,scrollbars=yes');
          break;
        case 'bing':
          window.open(`https://cn.bing.com/search?q=${text}`, 'SearchResult', 'resize=yes,scrollbars=yes');
          break;
        case 'google':
          window.open(`https://www.google.com/search?q=${text}`, 'SearchResult', 'resize=yes,scrollbars=yes');
          break;
        default:
          window.open(`https://www.baidu.com/s?wd=${text}`, 'SearchResult', 'resize=yes,scrollbars=yes');
          break;
      }
      return null;
    };
    const locate = (text, i = 0) => {
      const local = data.indexOf(text, i);
      if (local > -1) {
        return [local, ...locate(text, local + 1)];
      }
      return [];
    };
    const search = async (text) => {
      text = text.replace(/(？|，|。|！)$/g, '');
      if (data === 'none') {
        return searchFromWebPage(text, engine);
      }
      const result = [];
      const local = locate(text);
      const regText = new RegExp(text, 'g');
      for (const i of local) {
        const matchResult = data.slice(i - 100, i + 100).replace(regText, `<font style="color:red">${text}</font>`);
        if (highLightAnswer) {
          const arr = matchResult.split(text);
          arr[1] = arr[1].replace(/[\w]+/, '<font style="color:red">$&</font>');
          result.push(arr.join(text));
          continue;
        }
        result.push(matchResult);
      }
      return result.filter((e) => e.trim()).map((e) => {
        if (!(e.includes('<img') && imageData && Object.keys(imageData).length > 0)) {
          return e;
        }
        // eslint-disable-next-line
        Object.keys(imageData).map((imageMd5) => e.includes(`$${imageMd5}$`) && (e = e.replace(`$${imageMd5}$`, imageData[imageMd5])));
        return e;
      })
        .join('<br><hr data-content="分隔线">') || searchFromWebPage(text, engine);;
    };
    const readData = async () => {
      try {
        const imagesData = {};
        const data = await new Promise((res) => {
          // eslint-disable-next-line max-len
          const input = $('<input type="file" id="search-answer-js" style="width:50%;height:50%;color:red;position:fixed;left:25%;top:25%;background-color:red;z-index:99999999" title="点此加载题库" multiple="multiple">');
          $('body').append(input);
          input[0].addEventListener('change', async function selectedFileChanged() {
            if (this.files?.length) {
              Swal.fire('读取&处理中...', 'Excel格式文件和题目较多时处理较慢，请耐心等待！');
              Swal.showLoading();
              await new Promise((resolve) => {
                setTimeout(() => {
                  resolve(true);
                }, 1000);
              });
              const text = (await Promise.all([...(this.files || [])].map((file) => new Promise((resolve) => {
                const reader = new FileReader();
                const fileName = file.name;
                reader.onabort = () => resolve('');
                reader.onerror = () => resolve('');
                if (/.*?\.docx?$/.test(fileName)) {
                  reader.onload = async () => {
                    const arrayBuffer = reader.result;
                    const options = {
                      convertImage: mammoth.images.imgElement((image) => image.read('base64').then((imageBuffer) => {
                        const imageMd5 = md5(imageBuffer);
                        imagesData[imageMd5] = `data:${image.contentType};base64,${imageBuffer}`;
                        return {
                          src: `$${imageMd5}$`
                        };
                      }))
                    };
                    const { value: fileData } = await mammoth.convertToHtml({ arrayBuffer }, options);
                    resolve(fileData);
                  };
                  reader.readAsArrayBuffer(file);
                }
                else if (/.*?\.xlsx?$/.test(fileName)) {
                  reader.onload = async () => {
                    const arrayBuffer = reader.result;
                    const { Sheets } = XLSX.read(arrayBuffer);
                    // eslint-disable-next-line max-len
                    const fileData = Object.values(Sheets).map((sheet) => XLSX.utils.sheet_to_json(sheet, { header: 1 }).map((cell) => cell.map((value) => value?.toString()?.trim()).filter((value) => value)
                      .join(' | '))
                      .join('<br/>'))
                      .join('<br/>');
                    resolve(fileData);
                  };
                  reader.readAsArrayBuffer(file);
                }
                else {
                  reader.onload = () => {
                    const fileData = reader.result;
                    if (!fileData) {
                      return resolve('');
                    }
                    resolve(fileData);
                  };
                  reader.readAsText(file);
                }
              })))).join('<br/>');
              GM_setValue('data0', text);
              GM_setValue('data1', imagesData);
              input.remove();
              Swal.fire('题库加载完毕！');
              res(text);
            }
          });
          document.querySelector('#search-answer-js').click();
        });
        return { text: data, image: imagesData };
      }
      catch (error) {
        console.error(error);
        Swal.fire('题库加载失败！', '详情请查看控制台', 'error');
        return {};
      }
    };
    await Swal.fire({
      title: '是否加载题库？',
      html: '加载题库：如果你有题库，请加载你的题库（推荐）<br/>直接运行：如之前加载过题库，并且不需要重新加载题库<br/>无题库模式：弹出网页显示搜索结果',
      confirmButtonText: '加载题库',
      showCancelButton: true,
      cancelButtonText: '直接运行'
    }).then(async ({ isConfirmed, isDenied }) => {
      if (isConfirmed) {
        data = (await readData()).text;
        imageData = (await readData()).image;
      }
      else {
        data = GM_getValue('data0') || 'none';
        imageData = GM_getValue('data1') || '';
      }

      const { value: selectedEngine } = await Swal.fire({
        title: '请选择搜索引擎',
        input: 'radio',
        inputOptions: {
          baidu: '百度',
          sougou: '搜狗',
          bing: '必应',
          google: '谷歌'
        },
        inputValidator: (value) => {
          if (!value) {
            return '请选择一个搜索引擎！';
          }
          return '';
        }
      });
      if (selectedEngine) {
        engine = selectedEngine;
      }
    });
    if (!data)
      return Swal.fire('加载题库失败', '', 'error');

    document.addEventListener('click', async (e) => {
      if (e.target === document.querySelector('.senior-question__qs')) {
        const text = document.querySelector('.senior-question__qs').innerText;
        console.log(text);
        if (text) {
          const result = await search(text);
          if (data && data !== 'none' && result !== null) {
            Swal.fire({
              html: result
            });
          }
        }
      }
    });
  };
  const settings = () => {
    Swal.fire({
      title: '设置',
      // eslint-disable-next-line max-len
      html: `<div class="setting"><input id="high-light-answer" type="checkbox"${highLightAnswer ? ' checked="checked"' : ''}/>高亮答案（仅支持题库模式且题目后面要紧跟"ABCD..."格式的答案）<br/>启动快捷键：<input id="start-shortcut-key" type="text" readonly="readonly" value="${startShortcutKey || ''}"/></div>`,
      preConfirm: () => ({
        highLightAnswer: $('#high-light-answer').is(':checked'),
        startShortcutKey: $('#start-shortcut-key').val()
      })
    }).then(({ value }) => {
      highLightAnswer = value?.highLightAnswer;
      startShortcutKey = value?.startShortcutKey;
      GM_setValue('settings', {
        highLightAnswer, startShortcutKey
      });
    });
    $('#start-shortcut-key,#ocr-shortcut-key').on('keydown', function (event) {
      let functionKey = '';
      if (event.metaKey) {
        functionKey += 'Meta+';
      }
      if (event.ctrlKey) {
        functionKey += 'Control+';
      }
      if (event.altKey) {
        functionKey += 'Alt+';
      }
      if (event.shiftKey) {
        functionKey += 'Shift+';
      }
      const keyValue = event.key.toUpperCase();
      $(this).val(functionKey + (['MEAT', 'ALT', 'CONTROL', 'SHIFT'].includes(keyValue) ? '' : keyValue));
    });
  };
  const tinykeysOptions = {};
  if (startShortcutKey) {
    tinykeysOptions[startShortcutKey] = start;
  }
  window.tinykeys.default(window, tinykeysOptions);
  GM_registerMenuCommand('启动', start);
  GM_registerMenuCommand('设置', settings);
  GM_addStyle(`
.swal2-container {
  z-index: 9999999999 !important;
}
.swal2-html-container *{
  left:0;
  padding-left:0 !important;
  margin-left:0;
  border-left:0;
  width:100%;
}
.swal2-html-container hr{
  color: #a2a9b6;
  border: 0;
  font-size: 12px;
  padding: 1em 0;
  position: relative;
}
.swal2-html-container hr::before {
  content: attr(data-content);
  position: absolute;
  padding: 0 1ch;
  line-height: 1px;
  border: solid #d0d0d5;
  border-width: 0 99vw;
  width: fit-content;
  white-space: nowrap;
  left: 50%;
  transform: translateX(-50%);
}
.swal2-html-container hr::after{
  content: attr(data-content);
  position: absolute;
  padding: 4px 1ch;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  color: transparent;
  border: 1px solid #d0d0d5;
}
.swal2-html-container .setting {
  text-align: left;
}
.swal2-html-container input[type="checkbox"]{
  width: 15px;
}
.swal2-html-container input[type="text"]{
  width: 200px;
  border: 2px solid #00a9fd;
  border-radius: 5px;
  font-size: 15px;
}
`);
})();
