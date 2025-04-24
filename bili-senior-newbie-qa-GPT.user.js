// ==UserScript==
// @name         哔哩哔哩硬核会员搜题GPT
// @namespace    bili-senior-newbie-qa-GPT
// @version      1.4
// @description  哔哩哔哩硬核会员搜题GPT
// @author       HCLonely
// @include      *://www.bilibili.com/h5/senior-newbie/qa*
// @run-at       document-end
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
// @homepage     https://github.com/HCLonely/bili-senior-newbie-qa
// @require      https://cdn.jsdelivr.net/npm/jquery@3.2.1/dist/jquery.slim.min.js
// @license      Apache-2.0
// @connect      api.deepseek.com
// @connect      api.chatanywhere.tech
// ==/UserScript==

"use strict";
/* eslint-disable no-underscore-dangle, @typescript-eslint/no-empty-function */
(async () => {
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

  let { API_KEY, GPT_TYPE } = GM_getValue('API_KEY') || { API_KEY: '', GPT_TYPE: '' };
  let prevQuestion = '';
  GM_registerMenuCommand('设置 ChatAnywhere API 密钥', () => {
    const key = prompt('请输入 ChatAnywhere API 密钥：', API_KEY);
    if (key) {
      API_KEY = key;
      GPT_TYPE = 'ChatAnywhere';
      GM_setValue('API_KEY', { API_KEY, GPT_TYPE });
    }
  });
  GM_registerMenuCommand('设置 DeepSeek API 密钥', () => {
    const key = prompt('请输入 DeepSeek API 密钥：', API_KEY);
    if (key) {
      API_KEY = key;
      GPT_TYPE = 'DeepSeek';
      GM_setValue('API_KEY', { API_KEY, GPT_TYPE });
    }
  });
  GM_registerMenuCommand('启动', () => {
    if (!API_KEY) {
      alert('请先设置 API 密钥！');
      return;
    }
    console.clear();
    alert('启动后不要点击页面！');
    document.addEventListener('click', start);
    document.dispatchEvent(new Event('click'));
  });

  async function start(retry = 0) {
    const score = $('.score_block .num').text()?.trim();
    if (score) {
      return GM_notification({
        title: '哔哩哔哩硬核会员搜题GPT',
        text: `题目可能已做完，分数为 ${score} 分。`,
        timeout: 10000
      });
    }
    const delayTime = Math.floor(Math.random() * (30000 - 10000 + 1)) + 10000;
    console.log(`等待 ${delayTime / 1000} 秒后开始搜索下一题`);
    await sleep(delayTime);
    const question = $('div.senior-question.fade-out').find('.senior-question__qs,.senior-question__answer').toArray().map((v) => $(v).text().trim()).join('\n');
    if (!(question.includes('A') || question.includes('B') || question.includes('C') || question.includes('D'))) {
      if (retry > 3) {
        GM_notification({
          title: '哔哩哔哩硬核会员搜题GPT',
          text: '没有检测到题目，可能已做完。',
          timeout: 10000
        });
        return false;
      }
      return start(++retry);
    }
    if (question === prevQuestion) {
      if (retry > 3) {
        return GM_notification({
          title: '哔哩哔哩硬核会员搜题GPT',
          text: '重试次数已超过3次，请刷新页面重试或稍后再试。',
          timeout: 10000
        });
      }
      return start(++retry);
    }
    console.log(question);
    await askGPT(question);
    prevQuestion = question;
  }

  function askGPT(question, retry = 0) {
    return callGPTAPI(`请仅给出答案\n${question}`).then(async (answer) => {
      let option = answer.match(/\w/)?.[0]?.toUpperCase();
      if (!['A', 'B', 'C', 'D'].includes(option)) {
        const letters = 'ABCD';
        option = letters[Math.floor(Math.random() * letters.length)];
      }
      console.log(`选择答案：${option}`);
      await sleep(1000);
      buttonClick($('div.fade-out span.senior-question__answer--icon:contains(' + option + ')').parent()[0]);
    }).catch(async (error) => {
      if (retry > 3) {
        return GM_notification({
          title: '哔哩哔哩硬核会员搜题GPT',
          text: '重试次数已超过3次，请刷新页面重试或稍后再试。',
          timeout: 10000
        });
      }
      await sleep(3000);
      return askGPT(++retry);
    });
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function buttonClick(button) {
    const rect = button.getBoundingClientRect();
    const randomX = rect.left + Math.random() * rect.width;
    const randomY = rect.top + Math.random() * rect.height;
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      clientX: randomX,
      clientY: randomY,
    });
    button.dispatchEvent(clickEvent);
  }

  const API_URL = {
    'ChatAnywhere': 'https://api.chatanywhere.tech/v1/chat/completions',
    'DeepSeek': 'https://api.deepseek.com/v1/chat/completions'
  };
  const GPT_MODEL = {
    'ChatAnywhere': 'gpt-4o-mini',
    'DeepSeek': 'deepseek-chat'
  };
  function callGPTAPI(question) {
    return new Promise((resolve, reject) => {
      const apiUrl = API_URL[GPT_TYPE];
      const requestData = {
        "messages": [
          {
            "content": question,
            "role": "system"
          }
        ],
        temperature: 0.7,
        "model": GPT_MODEL[GPT_TYPE],
        "stream": false,
        "response_format": {
          "type": "text"
        }
      };
      GM_xmlhttpRequest({
        method: 'POST',
        url: apiUrl,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
        data: JSON.stringify(requestData),
        onload: function (response) {
          console.log('API 响应:', response.responseText);
          const data = JSON.parse(response.responseText);
          console.log('API 返回结果: ' + data.choices[0].message.content);
          resolve(data.choices[0].message.content);
        },
        onerror: function (error) {
          console.error('API 请求失败:', error);
          reject(error);
        },
      });
    });
  }
})();
