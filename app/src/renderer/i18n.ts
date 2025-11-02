import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: { translation: { title: 'RcloneBrowser v2', ping: 'Ping', version: 'rclone version', remotes: 'Remotes', browser: 'Browser', queue: 'Queue', mount: 'Mount', settings: 'Settings', add: 'Add', delete: 'Delete', start: 'Start', cancel: 'Cancel', theme: 'Theme', language: 'Language' } },
  'zh-CN': { translation: { title: 'RcloneBrowser v2', ping: 'Ping', version: 'rclone 版本', remotes: '远程', browser: '浏览器', queue: '队列', mount: '挂载', settings: '设置', add: '新增', delete: '删除', start: '开始', cancel: '取消', theme: '主题', language: '语言' } }
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false }
});

export default i18n;
