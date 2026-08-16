// Vendored from https://github.com/faisalman/ua-parser-js v1.0.41 (branch 1.0.x, MIT-licensed)
// Generated from the upstream test corpus (test/*-test.json), MIT license.
// "undefined" expectations from the JSON corpus are represented by omitting the key.

export interface UAFixture {
  desc: string
  ua: string
  expected: Record<string, string>
}

export const browserFixtures: UAFixture[] = [
  {
    desc: '115 Browser',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_16_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.61 Safari/537.36 115Browser/24.3.0.3',
    expected: { name: '115', version: '24.3.0.3', major: '24' },
  },
  {
    desc: '2345 Browser',
    ua: 'Mozilla/5.0 (Linux; Android 7.0; MI NOTE Pro Build/NRD90M; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/61.0.3163.98 Mobile Safari/537.36 Mb2345Browser/15.6.2',
    expected: { name: '2345', version: '15.6.2', major: '15' },
  },
  {
    desc: '2345 Chrome',
    ua: 'Mozilla/5.0 (Windows NT 6.3) AppleWebKit/537.36 (KHTML like Gecko) Chrome/39.0.2171.99 Safari/537.36 2345chrome v3.0.0.9739',
    expected: { name: '2345', version: '3.0.0.9739', major: '3' },
  },
  {
    desc: '2345 Explorer',
    ua: 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.90 Safari/537.36 2345Explorer/9.2.1.17116',
    expected: { name: '2345', version: '9.2.1.17116', major: '9' },
  },
  {
    desc: '360 Browser on iOS',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 12_4_1 like Mac OS X) AppleWebKit/607.3.9 (KHTML, like Gecko) Mobile/16G102 QHBrowser/317 QihooBrowser/4.0.10',
    expected: { name: '360', version: '4.0.10', major: '4' },
  },
  {
    desc: '360 Secure Browser on Windows 10',
    ua: 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36 QIHU 360SE',
    expected: { name: '360', version: '86.0.4240.198', major: '86' },
  },
  {
    desc: '360 Speed Browser on Windows 10',
    ua: 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36 QIHU 360EE',
    expected: { name: '360', version: '86.0.4240.198', major: '86' },
  },
  {
    desc: 'Alipay',
    ua: 'Mozilla/5.0 (Linux; U; Android 10; zh-CN; V2034A Build/QP1A.190711.020) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/69.0.3497.100 UWS/3.22.2.33 Mobile Safari/537.36 UCBS/3.22.2.33_211025173018 NebulaSDK/1.8.100112 Nebula AlipayDefined(nt:WIFI,ws:360|0|2.0) AliApp(AP/10.2.51.7100) AlipayClient/10.2.51.7100 Language/zh-Hans useStatusBar/true isConcaveScreen/true Region/CNAriver/1.0.0',
    expected: { name: 'Alipay', version: '10.2.51.7100', major: '10' },
  },
  {
    desc: 'Alipay',
    ua: 'Mozilla/5.0 (Linux; Android 10; VOG-AL00 Build/HUAWEIVOG-AL00; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/105.0.5195.148 MYWeb/0.2.103.0_20230131112530 UWS/3.22.2.9999 UCBS/3.22.2.9999_220000000000 Mobile Safari/537.36 NebulaSDK/1.8.100112 Nebula AlipayDefined(nt:WIFI,ws:360|0|3.0) AliApp(AP/10.3.50.9999) AlipayClient/10.3.50.9999 Language/en isConcaveScreen/true Region/CN ProductType/devAriver/1.0.0',
    expected: { name: 'Alipay', version: '10.3.50.9999', major: '10' },
  },
  {
    desc: 'Android Browser on Galaxy Nexus',
    ua: 'Mozilla/5.0 (Linux; U; Android 4.0.2; en-us; Galaxy Nexus Build/ICL53F) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
    expected: { name: 'Android Browser', version: '4.0', major: '4' },
  },
  {
    desc: 'Android Browser on Galaxy S3',
    ua: 'Mozilla/5.0 (Linux; Android 4.4.4; en-us; SAMSUNG GT-I9300I Build/KTU84P) AppleWebKit/537.36 (KHTML, like Gecko) Version/1.5 Chrome/28.0.1500.94 Mobile Safari/537.36',
    expected: { name: 'Android Browser', version: '1.5', major: '1' },
  },
  {
    desc: 'Android Browser on HTC Flyer (P510E)',
    ua: 'Mozilla/5.0 (Linux; U; Android 3.2.1; ru-ru; HTC Flyer P510e Build/HTK75C) AppleWebKit/534.13 (KHTML, like Gecko) Version/4.0 Safari/534.13',
    expected: { name: 'Android Browser', version: '4.0', major: '4' },
  },
  {
    desc: 'Android Browser on Huawei Honor Glory II (U9508)',
    ua: 'Mozilla/5.0 (Linux; U; Android 4.0.4; ru-by; HUAWEI U9508 Build/HuaweiU9508) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30 ACHEETAHI/2100050044',
    expected: { name: 'Android Browser', version: '4.0', major: '4' },
  },
  {
    desc: 'Android Browser on Huawei P8 (H891L)',
    ua: 'Mozilla/5.0 (Linux; Android 4.4.4; HUAWEI H891L Build/HuaweiH891L) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/33.0.0.0 Mobile Safari/537.36',
    expected: { name: 'Android Browser', version: '4.0', major: '4' },
  },
  {
    desc: 'Android Browser on Samsung S6 (SM-G925F)',
    ua: 'Mozilla/5.0 (Linux; Android 5.0.2; SAMSUNG SM-G925F Build/LRX22G) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/3.0 Chrome/38.0.2125.102 Mobile Safari/537.36',
    expected: { name: 'Samsung Internet', version: '3.0', major: '3' },
  },
  {
    desc: 'Sailfish Browser',
    ua: 'Mozilla/5.0 (Linux; U; Sailfish 3.0; Mobile; rv:45.0) Gecko/45.0 Firefox/45.0 SailfishBrowser/1.0',
    expected: { name: 'Sailfish Browser', version: '1.0', major: '1' },
  },
  {
    desc: 'Arora',
    ua: 'Mozilla/5.0 (Windows; U; Windows NT 5.1; de-CH) AppleWebKit/523.15 (KHTML, like Gecko, Safari/419.3) Arora/0.2',
    expected: { name: 'Arora', version: '0.2', major: '0' },
  },
  {
    desc: 'Avant',
    ua: 'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 5.1; Trident/4.0; GTB5; Avant Browser; .NET CLR 1.1.4322; .NET CLR 2.0.50727)',
    expected: { name: 'Avant' },
  },
  {
    desc: 'Avast Secure Browser',
    ua: 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.121 Safari/537.36 Avast/72.0.1174.122',
    expected: { name: 'Avast Secure Browser', version: '72.0.1174.122', major: '72' },
  },
  {
    desc: 'AVG Secure Browser',
    ua: 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.121 Safari/537.36 AVG/72.0.719.123',
    expected: { name: 'AVG Secure Browser', version: '72.0.719.123', major: '72' },
  },
  {
    desc: 'Baidu',
    ua: 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; baidubrowser 1.x)',
    expected: { name: 'Baidu', version: '1.x', major: '1' },
  },
  {
    desc: 'Baidu',
    ua: 'Mozilla/5.0 (Linux; Android 9; Redmi Note 5 Build/PKQ1.180904.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/110.0.5481.153 Mobile Safari/537.36 bdbrowser/6.4.0.4',
    expected: { name: 'Baidu', version: '6.4.0.4', major: '6' },
  },
  {
    desc: 'Baidu',
    ua: 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.31 (KHTML, like Gecko) Chrome/26.4.9999.1900 Safari/537.31 BDSpark/26.4',
    expected: { name: 'Baidu', version: '26.4', major: '26' },
  },
  {
    desc: 'Baidu',
    ua: 'Mozilla/5.0 (iPad; CPU OS 9_1 like Mac OS X) AppleWebKit/534.46 (KHTML, like Gecko) BaiduHD/5.4.0.0 Mobile/10A406 Safari/8536.25',
    expected: { name: 'Baidu', version: '5.4.0.0', major: '5' },
  },
  {
    desc: 'BaiDu Browser',
    ua: 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 BIDUBrowser/8.7 Safari/537.36',
    expected: { name: 'Baidu', version: '8.7', major: '8' },
  },
  {
    desc: 'baidu app on iOS',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 12_1_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/16C101 main%2F1.0 baiduboxapp/11.12.0.18 (Baidu; P2 12.1.2)',
    expected: { name: 'Baidu', version: '11.12.0.18', major: '11' },
  },
  {
    desc: 'baidu app on Android',
    ua: 'Mozilla/5.0 (Linux; Android 8.1.0; BKK-AL10 Build/HONORBKK-AL10; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/63.0.3239.83 Mobile Safari/537.36 T7/11.11 baiduboxapp/11.11.0.0 (Baidu; P1 8.1.0)',
    expected: { name: 'Baidu', version: '11.11.0.0', major: '11' },
  },
  {
    desc: 'Blazer',
    ua: 'Mozilla/4.0 (compatible; MSIE 6.0; Windows 98; PalmSource/hspr-H102; Blazer/4.0) 16;320x320',
    expected: { name: 'Blazer', version: '4.0', major: '4' },
  },
  {
    desc: 'Bolt',
    ua: 'Mozilla/5.0 (X11; 78; CentOS; US-en) AppleWebKit/527+ (KHTML, like Gecko) Bolt/0.862 Version/3.0 Safari/523.15',
    expected: { name: 'Bolt', version: '0.862', major: '0' },
  },
  {
    desc: 'Bowser',
    ua: 'Mozilla/5.0 (iOS; like Mac OS X) AppleWebKit/536.36 (KHTML, like Gecko) not Chrome/27.0.1500.95 Mobile/10B141 Safari/537.36 Bowser/0.2.1',
    expected: { name: 'Bowser', version: '0.2.1', major: '0' },
  },
  {
    desc: 'Camino',
    ua: 'Mozilla/5.0 (Macintosh; U; PPC Mac OS X 10.4; en; rv:1.9.0.19) Gecko/2011091218 Camino/2.0.9 (like Firefox/3.0.19)',
    expected: { name: 'Camino', version: '2.0.9', major: '2' },
  },
  {
    desc: 'Camino on Mac',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.5; rv:2.0.1) Gecko/20100101 Firefox/4.0.1 Camino/2.2.1',
    expected: { name: 'Camino', version: '2.2.1', major: '2' },
  },
  {
    desc: 'Chimera',
    ua: 'Mozilla/5.0 (Macintosh; U; PPC Mac OS X; pl-PL; rv:1.0.1) Gecko/20021111 Chimera/0.6',
    expected: { name: 'Chimera', version: '0.6', major: '0' },
  },
  {
    desc: 'Chrome',
    ua: 'Mozilla/5.0 (Windows NT 6.2) AppleWebKit/536.6 (KHTML, like Gecko) Chrome/20.0.1090.0 Safari/536.6',
    expected: { name: 'Chrome', version: '20.0.1090.0', major: '20' },
  },
  {
    desc: 'Chrome',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4758.102 Safari/537.36',
    expected: { name: 'Chrome', version: '100.0.4758.102', major: '100' },
  },
  {
    desc: 'Chrome 112.0 on Win10',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
    expected: { name: 'Chrome', version: '112.0.0.0', major: '112' },
  },
  {
    desc: 'Chrome 112.0 on macOS',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
    expected: { name: 'Chrome', version: '112.0.0.0', major: '112' },
  },
  {
    desc: 'Chrome 111.0 on Linux',
    ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
    expected: { name: 'Chrome', version: '111.0.0.0', major: '111' },
  },
  {
    desc: 'Chrome 111.0 on ChromeOS',
    ua: 'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
    expected: { name: 'Chrome', version: '111.0.0.0', major: '111' },
  },
  {
    desc: 'Chrome Headless',
    ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome Safari/537.36',
    expected: { name: 'Chrome Headless' },
  },
  {
    desc: 'Chrome Headless',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/60.0.3112.113 Safari/537.36',
    expected: { name: 'Chrome Headless', version: '60.0.3112.113', major: '60' },
  },
  {
    desc: 'Chrome WebView',
    ua: 'Mozilla/5.0 (Linux; Android 5.1.1; Nexus 5 Build/LMY48B; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/43.0.2357.65 Mobile Safari/537.36',
    expected: { name: 'Chrome WebView', version: '43.0.2357.65', major: '43' },
  },
  {
    desc: 'Chrome on iOS',
    ua: 'Mozilla/5.0 (iPhone; U; CPU iPhone OS 5_1_1 like Mac OS X; en) AppleWebKit/534.46.0 (KHTML, like Gecko) CriOS/19.0.1084.60 Mobile/9B206 Safari/7534.48.3',
    expected: { name: 'Chrome', version: '19.0.1084.60', major: '19' },
  },
  {
    desc: 'Chromium',
    ua: 'Mozilla/5.0 (X11; Linux i686) AppleWebKit/535.7 (KHTML, like Gecko) Ubuntu/11.10 Chromium/16.0.912.21 Chrome/16.0.912.21 Safari/535.7',
    expected: { name: 'Chromium', version: '16.0.912.21', major: '16' },
  },
  {
    desc: 'Chrome on Android',
    ua: 'Mozilla/5.0 (Linux; U; Android-4.0.3; en-us; Galaxy Nexus Build/IML74K) AppleWebKit/535.7 (KHTML, like Gecko) CrMo/16.0.912.75 Mobile Safari/535.7',
    expected: { name: 'Chrome', version: '16.0.912.75', major: '16' },
  },
  {
    desc: 'Coc Coc Browser',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_3) AppleWebKit/537.36 (KHTML, like Gecko) coc_coc_browser/78.0.129 Chrome/72.0.3626.129 Safari/537.36',
    expected: { name: 'Coc Coc', version: '78.0.129', major: '78' },
  },
  {
    desc: 'Comodo Dragon',
    ua: 'Mozilla/5.0 (Windows NT 6.2) AppleWebKit/535.7 (KHTML, like Gecko) Comodo_Dragon/16.1.1.0 Chrome/16.0.912.63 Safari/535.7',
    expected: { name: 'Dragon', version: '16.1.1.0', major: '16' },
  },
  {
    desc: 'Comodo Dragon',
    ua: 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Dragon/98.0.4758.102 Chrome/98.0.4758.102 Safari/537.36',
    expected: { name: 'Dragon', version: '98.0.4758.102', major: '98' },
  },
  {
    desc: 'Conkeror',
    ua: 'Mozilla/5.0 (X11; Linux x86_64; rv:6.0.1) Gecko/20110831 conkeror/0.9.3',
    expected: { name: 'conkeror', version: '0.9.3', major: '0' },
  },
  { desc: 'Dillo', ua: 'Dillo/2.2', expected: { name: 'Dillo', version: '2.2', major: '2' } },
  {
    desc: 'Dolphin',
    ua: 'Mozilla/5.0 (SCH-F859/F859DG12;U;NUCLEUS/2.1;Profile/MIDP-2.1 Configuration/CLDC-1.1;480*800;CTC/2.0) Dolfin/2.0',
    expected: { name: 'Dolphin', version: '2.0', major: '2' },
  },
  {
    desc: 'Doris',
    ua: 'Doris/1.15 [en] (Symbian)',
    expected: { name: 'Doris', version: '1.15', major: '1' },
  },
  {
    desc: 'DuckDuckGo',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.1517.4.1 Ddg/17.4.1',
    expected: { name: 'DuckDuckGo', version: '17.4.1', major: '17' },
  },
  {
    desc: 'DuckDuckGo',
    ua: 'Mozilla/5.0 (Linux; Android 8.1.0) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/92.0.4515.131 Mobile DuckDuckGo/5 Safari/537.36',
    expected: { name: 'DuckDuckGo', version: '5', major: '5' },
  },
  {
    desc: 'Epiphany',
    ua: 'Mozilla/5.0 (X11; U; FreeBSD i386; en-US; rv:1.7) Gecko/20040628 Epiphany/1.2.6',
    expected: { name: 'Epiphany', version: '1.2.6', major: '1' },
  },
  {
    desc: 'Flow',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_0) EkiohFlow/5.7.4.30559 Flow/5.7.4 (like Gecko Firefox/53.0 rv:53.0)',
    expected: { name: 'Flow', version: '5.7.4', major: '5' },
  },
  {
    desc: 'Go Browser',
    ua: 'NokiaE66/GoBrowser/2.0.297',
    expected: { name: 'GoBrowser', version: '2.0.297', major: '2' },
  },
  {
    desc: 'Waterfox',
    ua: 'Mozilla/5.0 (X11; Linux x86_64; rv:55.0) Gecko/20100101 Firefox/55.2.2 Waterfox/55.2.2',
    expected: { name: 'Waterfox', version: '55.2.2', major: '55' },
  },
  {
    desc: 'PaleMoon',
    ua: 'Mozilla/5.0 (X11; Linux x86_64; rv:52.9) Gecko/20100101 Goanna/3.4 Firefox/52.9 PaleMoon/27.6.1',
    expected: { name: 'PaleMoon', version: '27.6.1', major: '27' },
  },
  {
    desc: 'Basilisk',
    ua: 'Mozilla/5.0 (X11; Linux x86_64; rv:55.0) Gecko/20100101 Goanna/4.0 Firefox/55.0 Basilisk/20171113',
    expected: { name: 'Basilisk', version: '20171113', major: '20171113' },
  },
  {
    desc: 'Facebook in-App Browser for Android with version',
    ua: 'Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/43.0.2357.121 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/35.0.0.48.273;]',
    expected: { name: 'Facebook', version: '35.0.0.48.273', major: '35' },
  },
  {
    desc: 'Facebook in-App Browser for iOS with version',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Mobile/14E304 [FBAN/FBIOS;FBAV/91.0.0.41.73;FBBV/57050710;FBDV/iPhone8,1;FBMD/iPhone;FBSN/iOS;FBSV/10.3.1;FBSS/2;FBCR/Telekom.de;FBID/phone;FBLC/de_DE;FBOP/5;FBRV/0])',
    expected: { name: 'Facebook', version: '91.0.0.41.73', major: '91' },
  },
  {
    desc: 'Facebook in-App Browser for iOS without version',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBDV/iPhone10,2;FBMD/iPhone;FBSN/iOS;FBSV/13.3.1;FBSS/3;FBID/phone;FBLC/en_US;FBOP/5;FBCR/]',
    expected: { name: 'Facebook' },
  },
  {
    desc: 'Klarna in-App Browser for iOS',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Klarna/23.36.223',
    expected: { name: 'Klarna', version: '23.36.223', major: '23' },
  },
  {
    desc: 'Klarna in-App Browser for Android',
    ua: 'Mozilla/5.0 (Linux; Android 12; moto g(60)s Build/S3RLS32.114-25-13; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/116.0.0.0 Mobile Safari/537.36 Klarna/23.36.215',
    expected: { name: 'Klarna', version: '23.36.215', major: '23' },
  },
  {
    desc: 'Instagram in-App Browser for iOS',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 142.0.0.22.109 (iPhone12,5; iOS 14_1; en_US; en-US; scale=3.00; 1242x2688; 214888322) NW/1',
    expected: { name: 'Instagram', version: '142.0.0.22.109', major: '142' },
  },
  {
    desc: 'Falkon',
    ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Falkon/3.0.0 Chrome/61.0.3163.140 Safari/537.36',
    expected: { name: 'Falkon', version: '3.0.0', major: '3' },
  },
  {
    desc: 'Firebird',
    ua: 'Mozilla/5.0 (Windows; U; Win98; en-US; rv:1.5) Gecko/20031007 Firebird/0.7',
    expected: { name: 'Firebird', version: '0.7', major: '0' },
  },
  {
    desc: 'Firefox',
    ua: 'Mozilla/5.0 (Windows NT 6.1; rv:15.0) Gecko/20120716 Firefox/15.0a2',
    expected: { name: 'Firefox', version: '15.0a2', major: '15' },
  },
  {
    desc: 'Firefox',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:100.0) Gecko/20100101 Firefox/100.0',
    expected: { name: 'Firefox', version: '100.0', major: '100' },
  },
  {
    desc: 'Firefox Reality',
    ua: 'Mozilla/5.0 (Android 7.1.2; Mobile VR; rv:65.0) Gecko/65.0 Firefox/65.0',
    expected: { name: 'Firefox Reality', version: '65.0', major: '65' },
  },
  {
    desc: 'Firefox-based browser',
    ua: 'Mozilla/5.0 (X11; Linux x86_64; rv:80.0) Gecko/20100101 Firefox/80.0 AppName/1.0',
    expected: { name: 'Firefox', version: '80.0', major: '80' },
  },
  {
    desc: 'Fennec',
    ua: 'Mozilla/5.0 (X11; U; Linux armv61; en-US; rv:1.9.1b2pre) Gecko/20081015 Fennec/1.0a1',
    expected: { name: 'Fennec', version: '1.0a1', major: '1' },
  },
  {
    desc: 'Firefox for Maemo (Nokia N900)',
    ua: 'Mozilla/5.0 (Maemo; Linux armv7l; rv:10.0.1) Gecko/20100101 Firefox/10.0.1 Fennec/10.0.1',
    expected: { name: 'Fennec', version: '10.0.1', major: '10' },
  },
  {
    desc: 'Firefox Focus',
    ua: 'Mozilla/5.0 (Linux; Android 7.0) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Focus/6.1.1 Chrome/68.0.3440.91 Mobile Safari/537.36',
    expected: { name: 'Firefox Focus', version: '6.1.1', major: '6' },
  },
  {
    desc: 'Flock',
    ua: 'Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.9.0.3) Gecko/2008100716 Firefox/3.0.3 Flock/2.0',
    expected: { name: 'Flock', version: '2.0', major: '2' },
  },
  {
    desc: 'GoBrowser',
    ua: 'Nokia5700XpressMusic/GoBrowser/1.6.91',
    expected: { name: 'GoBrowser', version: '1.6.91', major: '1' },
  },
  {
    desc: 'Helio',
    ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.72 Safari/537.36 Helio/0.98.20',
    expected: { name: 'Helio', version: '0.98.20', major: '0' },
  },
  {
    desc: 'HeyTap',
    ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.61 Safari/537.36 HeyTapBrowser/40.8.10.1',
    expected: { name: 'HeyTap', version: '40.8.10.1', major: '40' },
  },
  {
    desc: 'HuaweiBrowser',
    ua: 'Mozilla/5.0 (Linux; Android 6.0.1; LYA-AL00；HMSCore/4.0.0 GMS/10.4 ) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.64 HuaweiBrowser/10.0.3.102 Mobile Safari/537.36',
    expected: { name: 'Huawei Browser', version: '10.0.3.102', major: '10' },
  },
  {
    desc: 'HuaweiBrowser',
    ua: 'Mozilla/5.0 (Linux; Android 6.0.1; LYA-AL00；HMSCore/4.0.0 ) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.64 HuaweiBrowser/10.0.3.102 Mobile Safari/537.36',
    expected: { name: 'Huawei Browser', version: '10.0.3.102', major: '10' },
  },
  {
    desc: 'HuaweiBrowser',
    ua: 'Mozilla/5.0 (Linux; Android 6.0.1; LYA-AL00；GMS/10.4 ) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.64 HuaweiBrowser/10.0.3.102 Mobile Safari/537.36',
    expected: { name: 'Huawei Browser', version: '10.0.3.102', major: '10' },
  },
  {
    desc: 'HuaweiBrowser',
    ua: 'Mozilla/5.0 (Linux; Android 6.0.1; LYA-AL00 ) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.64 HuaweiBrowser/10.0.3.102 Mobile Safari/537.36',
    expected: { name: 'Huawei Browser', version: '10.0.3.102', major: '10' },
  },
  {
    desc: 'IceApe',
    ua: 'Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.9.1.19) Gecko/20110817 Iceape/2.0.14',
    expected: { name: 'Iceape', version: '2.0.14', major: '2' },
  },
  {
    desc: 'ICEBrowser',
    ua: 'Mozilla/5.0 (Java 1.6.0_01; Windows XP 5.1 x86; en) ICEbrowser/v6_1_2',
    expected: { name: 'ICEbrowser', version: '6.1.2', major: '6' },
  },
  {
    desc: 'IceCat',
    ua: 'Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.9.0.3) Gecko/2008092921 IceCat/3.0.3-g1',
    expected: { name: 'IceCat', version: '3.0.3-g1', major: '3' },
  },
  {
    desc: 'Iceweasel',
    ua: 'Mozilla/5.0 (X11; U; Linux i686; de; rv:1.9.0.16) Gecko/2009121610 Iceweasel/3.0.6 (Debian-3.0.6-3)',
    expected: { name: 'Iceweasel', version: '3.0.6', major: '3' },
  },
  {
    desc: 'iCab',
    ua: 'iCab/2.9.5 (Macintosh; U; PPC; Mac OS X)',
    expected: { name: 'iCab', version: '2.9.5', major: '2' },
  },
  {
    desc: 'IEMobile',
    ua: 'Mozilla/4.0 (compatible; MSIE 6.0; Windows CE; IEMobile 7.11) 320x240; VZW; Motorola-Q9c; Windows Mobile 6.1 Standard',
    expected: { name: 'IEMobile', version: '7.11', major: '7' },
  },
  {
    desc: 'IE 11 with IE token',
    ua: 'Mozilla/5.0 (IE 11.0; Windows NT 6.3; WOW64; Trident/7.0; rv:11.0) like Gecko',
    expected: { name: 'IE', version: '11.0', major: '11' },
  },
  {
    desc: 'IE 11 without IE token',
    ua: 'Mozilla/5.0 (Windows NT 6.3; Trident/7.0; rv 11.0) like Gecko',
    expected: { name: 'IE', version: '11.0', major: '11' },
  },
  {
    desc: 'Iron',
    ua: 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.4 (KHTML, like Gecko) Chrome/22.0.1250.0 Iron/22.0.2150.0 Safari/537.4',
    expected: { name: 'Iron', version: '22.0.2150.0', major: '22' },
  },
  {
    desc: 'Iron',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Iron Safari/537.36',
    expected: { name: 'Iron', version: '129.0.0.0', major: '129' },
  },
  {
    desc: 'Iron',
    ua: 'Mozilla/5.0 (Linux; Android 11; Pixel 4 XL) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Mobile Iron Safari/537.36',
    expected: { name: 'Iron', version: '113.0.0.0', major: '113' },
  },
  {
    desc: 'Jasmine',
    ua: 'SAMSUNG-S8000/S8000XXIF3 SHP/VPP/R5 Jasmine/1.0 Nextreaming SMM-MMS/1.2.0 profile/MIDP-2.1 configuration/CLDC-1.1',
    expected: { name: 'Jasmine', version: '1.0', major: '1' },
  },
  {
    desc: 'K-Meleon',
    ua: 'Mozilla/5.0 (Windows; U; Win98; en-US; rv:1.5) Gecko/20031016 K-Meleon/0.8.2',
    expected: { name: 'K-Meleon', version: '0.8.2', major: '0' },
  },
  {
    desc: 'Kindle Browser',
    ua: 'Mozilla/4.0 (compatible; Linux 2.6.22) NetFront/3.4 Kindle/2.5 (screen 600x800; rotate)',
    expected: { name: 'Kindle', version: '2.5', major: '2' },
  },
  {
    desc: 'Klar < 4.1',
    ua: 'Mozilla/5.0 (Linux; Android 7.0) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Klar/1.0 Chrome/58.0.3029.83 Mobile Safari/537.36',
    expected: { name: 'Klar', version: '1.0', major: '1' },
  },
  {
    desc: 'Konqueror',
    ua: 'Mozilla/5.0 (compatible; Konqueror/3.5; Linux; X11; x86_64) KHTML/3.5.6 (like Gecko) (Kubuntu)',
    expected: { name: 'Konqueror', version: '3.5', major: '3' },
  },
  {
    desc: 'Konqueror',
    ua: 'Mozilla/5.0 (X11; Linux i686) AppleWebKit/534.34 (KHTML, like Gecko) konqueror/5.0.97 Safari/534.34',
    expected: { name: 'Konqueror', version: '5.0.97', major: '5' },
  },
  {
    desc: 'PicoBrowser',
    ua: 'Mozilla/5.0 (X11; Linux x86_64; Pico Neo3 Link OS5.8.4.0 like Quest) AppleWebKit/537.36 (KHTML, like Gecko) PicoBrowser/3.3.22 Chrome/105.0.5195.68 VR Safari/537.36',
    expected: { name: 'Pico Browser', version: '3.3.22', major: '3' },
  },
  {
    desc: 'PicoBrowser',
    ua: 'Mozilla/5.0 (X11; Linux x86_64; PICO 4 OS5.4.0 like Quest) AppleWebKit/537.36 (KHTML, like Gecko) PicoBrowser/3.3.22 Chrome/105.0.5195.68 VR Safari/537.36 OculusBrowser/7.0',
    expected: { name: 'Pico Browser', version: '3.3.22', major: '3' },
  },
  {
    desc: 'Rekonq',
    ua: 'Mozilla/5.0 (X11; U; Linux x86_64; cs-CZ) AppleWebKit/533.3 (KHTML, like Gecko) rekonq Safari/533.3',
    expected: { name: 'rekonq' },
  },
  {
    desc: 'Smart Lenovo Browser',
    ua: 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36 SLBrowser/8.0.0.10171 SLBChan/8',
    expected: { name: 'Smart Lenovo Browser', version: '8.0.0.10171', major: '8' },
  },
  {
    desc: 'Smart Lenovo Browser',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36 SLBrowser/9.0.0.9011 SLBChan/10',
    expected: { name: 'Smart Lenovo Browser', version: '9.0.0.9011', major: '9' },
  },
  {
    desc: 'LibreWolf',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:91.0) Gecko/20100101 LibreWolf/91.0',
    expected: { name: 'LibreWolf', version: '91.0', major: '91' },
  },
  {
    desc: 'Ladybird',
    ua: 'Mozilla/5.0 (Linux; x86_64) Ladybird/1.0',
    expected: { name: 'Ladybird', version: '1.0', major: '1' },
  },
  {
    desc: 'LibreWolf',
    ua: 'Mozilla/5.0 (X11; Linux x86_64; rv:97.0) Gecko/20100101 Firefox/97.0 LibreWolf/97.0.1',
    expected: { name: 'LibreWolf', version: '97.0.1', major: '97' },
  },
  {
    desc: 'LINE on Android',
    ua: 'Mozilla/5.0 (Linux; Android 5.0; ASUS_Z00AD Build/LRX21V; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/51.0.2704.81 Mobile Safari/537.36 Line/6.5.1/IAB',
    expected: { name: 'Line', version: '6.5.1', major: '6' },
  },
  {
    desc: 'LINE on iOS',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_2_6 like Mac OS X) AppleWebKit/604.5.6 (KHTML, like Gecko) Mobile/15D100 Safari Line/8.4.1',
    expected: { name: 'Line', version: '8.4.1', major: '8' },
  },
  {
    desc: 'Lunascape',
    ua: 'Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:1.9.1.2) Gecko/20090804 Firefox/3.5.2 Lunascape/5.1.4.5',
    expected: { name: 'Lunascape', version: '5.1.4.5', major: '5' },
  },
  {
    desc: 'Lynx',
    ua: 'Lynx/2.8.5dev.16 libwww-FM/2.14 SSL-MM/1.4.1 OpenSSL/0.9.6b',
    expected: { name: 'Lynx', version: '2.8.5dev.16', major: '2' },
  },
  {
    desc: 'Maemo Browser',
    ua: 'Mozilla/5.0 (X11; U; Linux armv7l; ru-RU; rv:1.9.2.3pre) Gecko/20100723 Firefox/3.5 Maemo Browser 1.7.4.8 RX-51 N900',
    expected: { name: 'Maemo Browser', version: '1.7.4.8', major: '1' },
  },
  {
    desc: 'Maxthon on Android',
    ua: 'Mozilla/5.0 (Linux; Android 5.1.1; KFAUWI Build/LVY48F; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/100.0.4896.127 Safari/537.36 MxBrowser/4.3.5.2000',
    expected: { name: 'Maxthon', version: '4.3.5.2000', major: '4' },
  },
  {
    desc: 'Maxthon on iOS',
    ua: 'Mozilla/5.0 (iPad; CPU OS 13_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/10.0 Mobile/15E148 Safari/602.1 MXiOS/5.4.5.2',
    expected: { name: 'Maxthon', version: '5.4.5.2', major: '5' },
  },
  {
    desc: 'Maxthon on Linux',
    ua: 'Mozilla/5.0 (X11; Linux i686; Ubuntu 14.04.3 LTS) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/33.0.1750.0 Maxthon/1.0.5.3 Safari/537.36',
    expected: { name: 'Maxthon', version: '1.0.5.3', major: '1' },
  },
  {
    desc: 'Maxthon on macOS',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/604.5.6 (KHTML, like Gecko) Version/11.0.3 Safari/604.5.6 Maxthon/5.1.102',
    expected: { name: 'Maxthon', version: '5.1.102', major: '5' },
  },
  {
    desc: 'Maxthon on Windows Server 2003',
    ua: 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.2; MyIE2; .NET CLR 1.1.4322)',
    expected: { name: 'Maxthon' },
  },
  {
    desc: 'Maxthon on Windows XP',
    ua: 'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 5.1; SV1; Maxthon; .NET CLR 1.1.4322)',
    expected: { name: 'Maxthon' },
  },
  {
    desc: 'Maxthon on Windows 10',
    ua: 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.79 Safari/537.36 Maxthon/5.2.7.2000',
    expected: { name: 'Maxthon', version: '5.2.7.2000', major: '5' },
  },
  {
    desc: 'Midori',
    ua: 'Midori/0.2.2 (X11; Linux i686; U; en-us) WebKit/531.2+',
    expected: { name: 'Midori', version: '0.2.2', major: '0' },
  },
  {
    desc: 'Minimo',
    ua: 'Mozilla/5.0 (X11; U; Linux armv6l; rv 1.8.1.5pre) Gecko/20070619 Minimo/0.020',
    expected: { name: 'Minimo', version: '0.020', major: '0' },
  },
  {
    desc: 'MIUI Browser on Xiaomi Hongmi WCDMA (HM2013023)',
    ua: 'Mozilla/5.0 (Linux; U; Android 4.2.2; ru-ru; 2013023 Build/HM2013023) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30 XiaoMi/MiuiBrowser/1.0',
    expected: { name: 'MIUI Browser', version: '1.0', major: '1' },
  },
  {
    desc: 'Mobile Safari',
    ua: 'Mozilla/5.0 (iPhone; U; CPU iPhone OS 4_0 like Mac OS X; en-us) AppleWebKit/532.9 (KHTML, like Gecko) Version/4.0.5 Mobile/8A293 Safari/6531.22.7',
    expected: { name: 'Mobile Safari', version: '4.0.5', major: '4' },
  },
  {
    desc: 'Mosaic',
    ua: 'NCSA_Mosaic/2.6 (X11; SunOS 4.1.3 sun4m)',
    expected: { name: 'Mosaic', version: '2.6', major: '2' },
  },
  {
    desc: 'Mozilla',
    ua: 'Mozilla/5.0 (X11; U; SunOS sun4u; en-US; rv:1.7) Gecko/20070606',
    expected: { name: 'Mozilla', version: '5.0', major: '5' },
  },
  {
    desc: 'MSIE',
    ua: 'Mozilla/4.0 (compatible; MSIE 5.0b1; Mac_PowerPC)',
    expected: { name: 'IE', version: '5.0b1', major: '5' },
  },
  {
    desc: 'NetFront',
    ua: 'Mozilla/4.0 (PDA; Windows CE/1.0.1) NetFront/3.0',
    expected: { name: 'NetFront', version: '3.0', major: '3' },
  },
  {
    desc: 'Netscape on Windows ME',
    ua: 'Mozilla/5.0 (Windows; U; Win 9x 4.90; en-US; rv:1.8.1.8pre) Gecko/20071015 Firefox/2.0.0.7 Navigator/9.0',
    expected: { name: 'Netscape', version: '9.0', major: '9' },
  },
  {
    desc: 'Netscape on Windows 2000',
    ua: 'Mozilla/5.0 (Windows; U; Windows NT 5.0; en-US; rv:1.7.5) Gecko/20050519 Netscape/8.0.1',
    expected: { name: 'Netscape', version: '8.0.1', major: '8' },
  },
  {
    desc: 'Netscape 6',
    ua: 'Mozilla/5.0 (Windows; U; Win95; de-DE; rv:0.9.2) Gecko/20010726 Netscape6/6.1',
    expected: { name: 'Netscape', version: '6.1', major: '6' },
  },
  {
    desc: 'NetSurf in Plan9',
    ua: 'Mozilla/5.0 (Plan9) NetSurf/3.12',
    expected: { name: 'NetSurf', version: '3.12', major: '3' },
  },
  {
    desc: 'NetSurf in Linux',
    ua: 'NetSurf/3.10 (Linux; Arch Linux)',
    expected: { name: 'NetSurf', version: '3.10', major: '3' },
  },
  {
    desc: 'Nokia Browser',
    ua: 'Mozilla/5.0 (Symbian/3; Series60/5.2 NokiaN8-00/025.007; Profile/MIDP-2.1 Configuration/CLDC-1.1 ) AppleWebKit/533.4 (KHTML, like Gecko) NokiaBrowser/7.3.1.37 Mobile Safari/533.4 3gpp-gba',
    expected: { name: 'NokiaBrowser', version: '7.3.1.37', major: '7' },
  },
  {
    desc: 'Obigo',
    ua: 'LG-GS290/V100 Obigo/WAP2.0 Profile/MIDP-2.1 Configuration/CLDC-1.1',
    expected: { name: 'Obigo', version: 'WAP2.0', major: '2' },
  },
  {
    desc: 'Obigo',
    ua: 'LG/KU990i/v10a Browser/Obigo-Q05A/3.6 MMS/LG-MMS-V1.0/1.2 Java/ASVM/1.0 Profile/MIDP-2.0 Configuration/CLDC-1.1',
    expected: { name: 'Obigo', version: 'Q05A', major: '05' },
  },
  {
    desc: 'Oculus Browser',
    ua: 'Mozilla/5.0 (Linux; Android 7.0; SM-G920I Build/NRD90M) AppleWebKit/537.36 (KHTML, like Gecko) OculusBrowser/3.4.9 SamsungBrowser/4.0 Chrome/57.0.2987.146 Mobile VR Safari/537.36',
    expected: { name: 'Oculus Browser', version: '3.4.9', major: '3' },
  },
  {
    desc: 'Oculus Browser',
    ua: 'Mozilla/5.0 (Linux; Android 10; Quest 2) AppleWebKit/537.36 (KHTML, like Gecko) OculusBrowser/15.0.0.0.22.280317669 SamsungBrowser/4.0 Chrome/89.0.4389.90 VR Safari/537.36',
    expected: { name: 'Oculus Browser', version: '15.0.0.0.22.280317669', major: '15' },
  },
  {
    desc: 'OmniWeb',
    ua: 'Mozilla/5.0 (Macintosh; U; PPC Mac OS X; en-US) AppleWebKit/85 (KHTML, like Gecko) OmniWeb/v558.48',
    expected: { name: 'OmniWeb', version: '558.48', major: '558' },
  },
  {
    desc: 'Opera > 9.80',
    ua: 'Opera/9.80 (X11; Linux x86_64; U; Linux Mint; en) Presto/2.2.15 Version/10.10',
    expected: { name: 'Opera', version: '10.10', major: '10' },
  },
  {
    desc: 'Opera < 9.80 on Windows',
    ua: 'Mozilla/4.0 (compatible; MSIE 5.0; Windows 95) Opera 6.01 [en]',
    expected: { name: 'Opera', version: '6.01', major: '6' },
  },
  {
    desc: 'Opera < 9.80 on OSX',
    ua: 'Opera/8.5 (Macintosh; PPC Mac OS X; U; en)',
    expected: { name: 'Opera', version: '8.5', major: '8' },
  },
  {
    desc: 'Opera Mobile',
    ua: 'Opera/9.80 (Android 2.3.5; Linux; Opera Mobi/ADR-1111101157; U; de) Presto/2.9.201 Version/11.50',
    expected: { name: 'Opera Mobi', version: '11.50', major: '11' },
  },
  {
    desc: 'Opera Webkit',
    ua: 'Mozilla/5.0 AppleWebKit/537.22 (KHTML, like Gecko) Chrome/25.0.1364.123 Mobile Safari/537.22 OPR/14.0.1025.52315',
    expected: { name: 'Opera', version: '14.0.1025.52315', major: '14' },
  },
  {
    desc: 'Opera Mini',
    ua: 'Opera/9.80 (J2ME/MIDP; Opera Mini/5.1.21214/19.916; U; en) Presto/2.5.25',
    expected: { name: 'Opera Mini', version: '5.1.21214', major: '5' },
  },
  {
    desc: 'Opera Mini 8 above on iPhone',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_2 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) OPiOS/12.1.1.98980 Mobile/13C75 Safari/9537.53',
    expected: { name: 'Opera Mini', version: '12.1.1.98980', major: '12' },
  },
  {
    desc: 'Opera GX on Android',
    ua: 'Mozilla/5.0 (Linux; Android 10; Redmi Note 8 Pro Build/QP1A.190711.020) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.5790.168 Mobile Safari/537.36 OPX/2',
    expected: { name: 'Opera GX', version: '2', major: '2' },
  },
  {
    desc: 'Opera GX on Windows',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.103 Safari/537.36 OPR/60.0.3255.50747 OPRGX/60.0.3255.50747',
    expected: { name: 'Opera GX', version: '60.0.3255.50747', major: '60' },
  },
  {
    desc: 'Opera Tablet',
    ua: 'Opera/9.80 (Windows NT 6.1; Opera Tablet/15165; U; en) Presto/2.8.149 Version/11.1',
    expected: { name: 'Opera Tablet', version: '11.1', major: '11' },
  },
  {
    desc: 'Opera Coast',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_3_2 like Mac OS X; en) AppleWebKit/601.1.46 (KHTML, like Gecko) Coast/5.04.110603 Mobile/13F69 Safari/7534.48.3',
    expected: { name: 'Opera Coast', version: '5.04.110603', major: '5' },
  },
  {
    desc: 'Opera Touch',
    ua: 'Mozilla/5.0 (Linux; Android 7.0; Lenovo P2a42 Build/NRD90N) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/68.0.3440.91 Mobile Safari/537.36 OPT/1.10.33',
    expected: { name: 'Opera Touch', version: '1.10.33', major: '1' },
  },
  {
    desc: 'OviBrowser',
    ua: 'Mozilla/5.0 (Series40; NokiaX3-02/le6.32; Profile/MIDP-2.1 Configuration/CLDC-1.1) Gecko/20100401 S40OviBrowser/1.0.0.11.8',
    expected: { name: 'OviBrowser', version: '1.0.0.11.8', major: '1' },
  },
  {
    desc: 'PhantomJS',
    ua: 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/534.34 (KHTML, like Gecko) PhantomJS/1.9.2 Safari/534.34',
    expected: { name: 'PhantomJS', version: '1.9.2', major: '1' },
  },
  {
    desc: 'Phoenix',
    ua: 'Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.2b) Gecko/20021029 Phoenix/0.4',
    expected: { name: 'Phoenix', version: '0.4', major: '0' },
  },
  {
    desc: 'Polaris',
    ua: 'LG-LX600 Polaris/6.0 MMP/2.0 Profile/MIDP-2.1 Configuration/CLDC-1.1',
    expected: { name: 'Polaris', version: '6.0', major: '6' },
  },
  {
    desc: 'QQBrowser',
    ua: 'Mozilla/5.0 (Linux; U; Android 4.4.4; zh-cn; OPPO R7s Build/KTU84P) AppleWebKit/537.36 (KHTML, like Gecko)Version/4.0 Chrome/37.0.0.0 MQQBrowser/7.1 Mobile Safari/537.36',
    expected: { name: 'QQBrowser', version: '7.1', major: '7' },
  },
  {
    desc: 'QQBrowser',
    ua: 'Mozilla/5.0 (Linux; U; Android 9; zh-cn; vivo X21 Build/PKQ1.180819.001) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/66.0.3359.126 MQQBrowser/9.9 Mobile Safari/537.36',
    expected: { name: 'QQBrowser', version: '9.9', major: '9' },
  },
  {
    desc: 'Quark',
    ua: 'Mozilla/5.0 (Linux; U; Android 12; zh-Hans-CN; JLH-AN00 Build/HONORJLH-AN00) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/78.0.3904.108 Quark/5.8.2.221 Mobile Safari/537.36',
    expected: { name: 'Quark', version: '5.8.2.221', major: '5' },
  },
  {
    desc: 'Quark',
    ua: 'mozilla/5.0 (windows nt 10.0; win64; x64) applewebkit/537.36 (khtml, like gecko) chrome/112.0.0.0 safari/537.36 quarkpc/1.5.5.75',
    expected: { name: 'Quark', version: '1.5.5.75', major: '1' },
  },
  {
    desc: 'QupZilla',
    ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/538.1 (KHTML, like Gecko) QupZilla/1.8.9 Safari/538.1',
    expected: { name: 'QupZilla', version: '1.8.9', major: '1' },
  },
  {
    desc: 'Rekonq 2',
    ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.21 (KHTML, like Gecko) rekonq/2.2.1 Safari/537.21',
    expected: { name: 'rekonq', version: '2.2.1', major: '2' },
  },
  {
    desc: 'RockMelt',
    ua: 'Mozilla/5.0 (Windows; U; Windows NT 6.1; en-US) AppleWebKit/534.7 (KHTML, like Gecko) RockMelt/0.8.36.78 Chrome/7.0.517.44 Safari/534.7',
    expected: { name: 'RockMelt', version: '0.8.36.78', major: '0' },
  },
  {
    desc: 'Safari',
    ua: 'Mozilla/5.0 (Windows; U; Windows NT 5.2; en-US) AppleWebKit/533.17.8 (KHTML, like Gecko) Version/5.0.1 Safari/533.17.8',
    expected: { name: 'Safari', version: '5.0.1', major: '5' },
  },
  {
    desc: 'Safari < 3.0',
    ua: 'Mozilla/5.0 (Macintosh; U; PPC Mac OS X; sv-se) AppleWebKit/419 (KHTML, like Gecko) Safari/419.3',
    expected: { name: 'Safari', version: '2.0.4', major: '2' },
  },
  {
    desc: 'Samsung Internet for Android',
    ua: 'Mozilla/5.0 (Linux; Android 6.0.1; SAMSUNG-SM-G925A Build/MMB29K) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/4.0 Chrome/44.0.2403.133 Mobile Safari/537.36',
    expected: { name: 'Samsung Internet', version: '4.0', major: '4' },
  },
  {
    desc: 'Samsung Internet for Tizen Mobile',
    ua: 'Mozilla/5.0 (Linux; Tizen 2.3; SAMSUNG SM-Z130H) AppleWebKit/537.3 (KHTML, like Gecko) SamsungBrowser/1.0 Mobile Safari/537.3',
    expected: { name: 'Samsung Internet', version: '1.0', major: '1' },
  },
  {
    desc: 'Samsung Internet for Smart-TV',
    ua: 'Mozilla/5.0 (SMART-TV; Linux; Tizen 2.3) AppleWebkit/538.1 (KHTML, like Gecko) SamsungBrowser/1.0 TV Safari/538.1',
    expected: { name: 'Samsung Internet', version: '1.0', major: '1' },
  },
  {
    desc: 'Samsung Internet for Gear VR',
    ua: 'Mozilla/5.0 (Linux; Android 5.0.2; SAMSUNG SM-G925K Build/LRX22G) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/4.0 Chrome/44.0.2403.133 Mobile VR Safari/537.36',
    expected: { name: 'Samsung Internet', version: '4.0', major: '4' },
  },
  {
    desc: 'SeaMonkey',
    ua: 'Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.9.1b4pre) Gecko/20090405 SeaMonkey/2.0b1pre',
    expected: { name: 'SeaMonkey', version: '2.0b1pre', major: '2' },
  },
  {
    desc: 'SeaMonkey on Mac',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.5; rv:10.0.1) Gecko/20100101 Firefox/10.0.1 SeaMonkey/2.7.1',
    expected: { name: 'SeaMonkey', version: '2.7.1', major: '2' },
  },
  {
    desc: 'Silk Browser',
    ua: 'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_3; en-us; Silk/1.1.0-84)',
    expected: { name: 'Silk', version: '1.1.0-84', major: '1' },
  },
  {
    desc: 'Skyfire',
    ua: 'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_5_7; en-us) AppleWebKit/530.17 (KHTML, like Gecko) Version/4.0 Safari/530.17 Skyfire/2.0',
    expected: { name: 'Skyfire', version: '2.0', major: '2' },
  },
  {
    desc: 'Sleipnir',
    ua: 'Mozilla/5.0 (Linux; Android 10; SOV37 Build/52.1.C.0.220; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/123.0.6312.120 Mobile Safari/537.36 Sleipnir/3.7.5',
    expected: { name: 'Sleipnir', version: '3.7.5', major: '3' },
  },
  {
    desc: 'Sleipnir',
    ua: 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; Sleipnir 2.8.4)',
    expected: { name: 'Sleipnir', version: '2.8.4', major: '2' },
  },
  {
    desc: 'Sleipnir',
    ua: 'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 5.1; Trident/4.0; .NET CLR 1.1.4322; .NET CLR 2.0.50727; InfoPath.1; .NET CLR 3.0.04506.648; .NET CLR 3.5.21022) Sleipnir/2.8.4',
    expected: { name: 'Sleipnir', version: '2.8.4', major: '2' },
  },
  {
    desc: 'SlimBoat',
    ua: 'Mozilla/5.0 (Windows NT 5.2) AppleWebKit/534.34 (KHTML, like Gecko) SlimBoat/1.1.23 Chrome/11.0.696.7 Version/5.1 Safari/534.34',
    expected: { name: 'SlimBoat', version: '1.1.23', major: '1' },
  },
  {
    desc: 'SlimBrowser',
    ua: 'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 5.1; Trident/4.0; SlimBrowser)',
    expected: { name: 'SlimBrowser' },
  },
  {
    desc: 'Slimjet',
    ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.75 Safari/537.36 Slimjet/20.0.2.0',
    expected: { name: 'Slimjet', version: '20.0.2.0', major: '20' },
  },
  {
    desc: 'Swiftfox',
    ua: 'Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.8.1) Gecko/20061024 Firefox/2.0 (Swiftfox)',
    expected: { name: 'Swiftfox' },
  },
  {
    desc: 'Tesla',
    ua: 'Mozilla/5.0 (X11; GNU/Linux) AppleWebKit/601.1 (KHTML, like Gecko) Tesla QtCarBrowser Safari/601.1',
    expected: { name: 'Tesla' },
  },
  {
    desc: 'Tesla',
    ua: 'Mozilla/5.0 (X11; GNU/Linux) AppleWebKit/537.36 (KHTML, like Gecko) Chromium/79.0.3945.130 Chrome/79.0.3945.130 Safari/537.36 Tesla/2020.16.2.1-e99c70fff409',
    expected: { name: 'Tesla', version: '2020.16.2.1-e99c70fff409', major: '2020' },
  },
  {
    desc: 'Tizen Browser',
    ua: 'Mozilla/5.0 (Linux; U; Tizen/1.0 like Android; en-us; AppleWebKit/534.46 (KHTML, like Gecko) Tizen Browser/1.0 Mobile',
    expected: { name: 'Tizen Browser', version: '1.0', major: '1' },
  },
  {
    desc: 'UC Browser',
    ua: 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.99 UBrowser/5.6.12860.7 Safari/537.36',
    expected: { name: 'UCBrowser', version: '5.6.12860.7', major: '5' },
  },
  {
    desc: 'UC Browser',
    ua: 'Mozilla/5.0 (Linux; U; Android 6.0.1; en-US; Lenovo P2a42 Build/MMB29M) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 UCBrowser/11.2.0.915 U3/0.8.0 Mobile Safari/534.30',
    expected: { name: 'UCBrowser', version: '11.2.0.915', major: '11' },
  },
  {
    desc: 'UC Browser on Samsung',
    ua: 'Mozilla/5.0 (Java; U; Pt-br; samsung-gt-s5620) UCBrowser8.2.1.144/69/352/UCWEB Mobile UNTRUSTED/1.0',
    expected: { name: 'UCBrowser', version: '8.2.1.144', major: '8' },
  },
  {
    desc: 'UC Browser on Nokia',
    ua: 'Mozilla/5.0 (S60V3; U; en-in; NokiaN73)/UC Browser8.4.0.159/28/351/UCWEB Mobile',
    expected: { name: 'UCBrowser', version: '8.4.0.159', major: '8' },
  },
  {
    desc: 'UC Browser J2ME',
    ua: 'UCWEB/2.0 (MIDP-2.0; U; zh-CN; HTC EVO 3D X515m) U2/1.0.0 UCBrowser/10.4.0.558 U2/1.0.0 Mobile',
    expected: { name: 'UCBrowser', version: '10.4.0.558', major: '10' },
  },
  {
    desc: 'UC Browser J2ME 2',
    ua: 'JUC (Linux; U; 2.3.5; zh-cn; GT-I9100; 480*800) UCWEB7.9.0.94/139/800',
    expected: { name: 'UCBrowser', version: '7.9.0.94', major: '7' },
  },
  {
    desc: 'UP.Browser',
    ua: 'BenQ-CF61/1.00/WAP2.0/MIDP2.0/CLDC1.0 UP.Browser/6.3.0.4.c.1.102 (GUI) MMP/2.0',
    expected: { name: 'UP.Browser', version: '6.3.0.4.c.1.102', major: '6' },
  },
  {
    desc: 'WeChat on iOS',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 8_4_1 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) Mobile/12H321 MicroMessenger/6.3.6 NetType/WIFI Language/zh_CN',
    expected: { name: 'WeChat', version: '6.3.6', major: '6' },
  },
  {
    desc: 'WeChat on Android',
    ua: 'Mozilla/5.0 (Linux; U; Android 5.1; zh-cn; Lenovo K50-t5 Build/LMY47D) AppleWebKit/533.1 (KHTML, like Gecko)Version/4.0 MQQBrowser/5.4 TBS/025478 Mobile Safari/533.1 MicroMessenger/6.3.5.50_r1573191.640 NetType/WIFI Language/zh_CN',
    expected: { name: 'WeChat', version: '6.3.5.50_r1573191.640', major: '6' },
  },
  {
    desc: 'WeiBo on Android',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 12_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/16A366 Weibo (iPhone8,2__weibo__8.9.3__iphone__os12.0)',
    expected: { name: 'weibo', version: '8.9.3', major: '8' },
  },
  {
    desc: 'Vivaldi',
    ua: 'Mozilla/5.0 (Windows NT 6.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.89 Vivaldi/1.0.83.38 Safari/537.36',
    expected: { name: 'Vivaldi', version: '1.0.83.38', major: '1' },
  },
  {
    desc: 'Vivaldi on Mac',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.88 Safari/537.36 Vivaldi/2.4.1488.36',
    expected: { name: 'Vivaldi', version: '2.4.1488.36', major: '2' },
  },
  {
    desc: 'Vivo Browser',
    ua: 'Mozilla/5.0 (Linux; Android 13; 23049RAD8C; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/87.0.4280.141 Mobile Safari/537.36 VivoBrowser/16.7.1.1',
    expected: { name: 'Vivo Browser', version: '16.7.1.1', major: '16' },
  },
  { desc: 'w3m', ua: 'w3m/0.5.1', expected: { name: 'w3m', version: '0.5.1', major: '0' } },
  {
    desc: 'Wolvic',
    ua: 'Mozilla/5.0 (Android 12; Mobile VR; rv:121.0) Gecko/121.0 Firefox/121.0 Wolvic/1.6.1',
    expected: { name: 'Wolvic', version: '1.6.1', major: '1' },
  },
  {
    desc: 'Yandex',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_2) AppleWebKit/536.5 (KHTML, like Gecko) YaBrowser/1.0.1084.5402 Chrome/19.0.1084.5402 Safari/536.5',
    expected: { name: 'Yandex', version: '1.0.1084.5402', major: '1' },
  },
  {
    desc: 'Yandex',
    ua: 'Mozilla/5.0 (Linux; arm_64; Android 11; M2101K7AG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.5005.125 YaApp_Android/22.70 YaSearchBrowser/22.70 BroPP/1.0 SA/3 Mobile Safari/537.36',
    expected: { name: 'Yandex', version: '22.70', major: '22' },
  },
  {
    desc: 'Yandex',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 YaBrowser/23.3.0.2246 Yowser/2.5 Safari/537.36',
    expected: { name: 'Yandex', version: '23.3.0.2246', major: '23' },
  },
  {
    desc: 'Yandex on Android',
    ua: 'Mozilla/5.0 (Linux; arm_64; Android 13; SM-G965F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.5672.76 YaBrowser/21.3.4.59 Mobile Safari/537.36',
    expected: { name: 'Yandex', version: '21.3.4.59', major: '21' },
  },
  {
    desc: 'Yandex on iPhone',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 YaBrowser/23.3.3.330 Mobile/15E148 Safari/604.1',
    expected: { name: 'Yandex', version: '23.3.3.330', major: '23' },
  },
  {
    desc: 'Yandex on iPad',
    ua: 'Mozilla/5.0 (iPad; CPU OS 16_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 YaBrowser/23.3.3.330 Mobile/15E148 Safari/605.1',
    expected: { name: 'Yandex', version: '23.3.3.330', major: '23' },
  },
  {
    desc: 'Yandex on iPod',
    ua: 'Mozilla/5.0 (iPod touch; CPU iPhone 16_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 YaBrowser/23.3.3.330 Mobile/15E148 Safari/605.1',
    expected: { name: 'Yandex', version: '23.3.3.330', major: '23' },
  },
  {
    desc: 'Puffin',
    ua: 'Mozilla/5.0 (Linux; Android 6.0.1; Lenovo P2a42 Build/MMB29M; en-us) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Mobile Safari/537.36 Puffin/6.0.8.15804AP',
    expected: { name: 'Puffin', version: '6.0.8.15804AP', major: '6' },
  },
  {
    desc: 'Microsoft Edge 0.1',
    ua: 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.71 Safari/537.36 Edge/12.0',
    expected: { name: 'Edge', version: '12.0', major: '12' },
  },
  {
    desc: 'Microsoft Edge 42',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.140 Safari/537.36 Edge/17.17134',
    expected: { name: 'Edge', version: '17.17134', major: '17' },
  },
  {
    desc: 'Microsoft Edge 44',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.140 Safari/537.36 Edge/18.17763',
    expected: { name: 'Edge', version: '18.17763', major: '18' },
  },
  {
    desc: 'Microsoft Edge 100',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.1108.55 Safari/537.36 Edg/100.0.1108.55',
    expected: { name: 'Edge', version: '100.0.1108.55', major: '100' },
  },
  {
    desc: 'Microsoft Edge on iOS',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/11.0 EdgiOS/42.1.1.0 Mobile/15F79 Safari/605.1.15',
    expected: { name: 'Edge', version: '42.1.1.0', major: '42' },
  },
  {
    desc: 'Microsoft Edge on Android',
    ua: 'Mozilla/5.0 (Linux; Android 8.0.0; G8441 Build/47.1.A.12.270) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.123 Mobile Safari/537.36 EdgA/42.0.0.2529',
    expected: { name: 'Edge', version: '42.0.0.2529', major: '42' },
  },
  {
    desc: 'Microsoft Edge Chromium',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.48 Safari/537.36 Edg/74.1.96.24',
    expected: { name: 'Edge', version: '74.1.96.24', major: '74' },
  },
  {
    desc: 'Iridium',
    ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Iridium/43.8 Safari/537.36 Chrome/43.0.2357.132',
    expected: { name: 'Iridium', version: '43.8', major: '43' },
  },
  {
    desc: 'Firefox iOS',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) FxiOS/1.1 Mobile/13B143 Safari/601.1.46',
    expected: { name: 'Firefox', version: '1.1', major: '1' },
  },
  {
    desc: 'Firefox on iOS',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/112.0 Mobile/15E148 Safari/605.1.15',
    expected: { name: 'Firefox', version: '112.0', major: '112' },
  },
  {
    desc: 'Firefox iOS using iPad',
    ua: 'Mozilla/5.0 (iPad; CPU iPhone OS 8_3 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) FxiOS/1.0 Mobile/12F69 Safari/600.1.4',
    expected: { name: 'Firefox', version: '1.0', major: '1' },
  },
  {
    desc: 'QQ on iOS',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_0_2 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) Mobile/14A456 QQ/6.5.3.410 V1_IPH_SQ_6.5.3_1_APP_A Pixel/1080 Core/UIWebView NetType/WIFI Mem/26',
    expected: { name: 'QQBrowser', version: '6.5.3.410', major: '6' },
  },
  {
    desc: 'QQ on Android',
    ua: 'Mozilla/5.0 (Linux; Android 6.0; PRO 6 Build/MRA58K) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/37.0.0.0 Mobile MQQBrowser/6.8 TBS/036824 Safari/537.36 V1_AND_SQ_6.5.8_422_YYB_D PA QQ/6.5.8.2910 NetType/WIFI WebP/0.3.0 Pixel/1080',
    expected: { name: 'QQBrowser', version: '6.5.8.2910', major: '6' },
  },
  {
    desc: 'WeChat Desktop for Windows Built-in Browser',
    ua: 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.95 Safari/537.36 MicroMessenger/6.5.2.501 NetType/WIFI WindowsWechat QBCore/3.43.901.400 QQBrowser/9.0.2524.400',
    expected: { name: 'WeChat', version: '3.43.901.400', major: '3' },
  },
  {
    desc: 'WeChat Desktop for Windows Built-in Browser major version in 4',
    ua: 'mozilla/5.0 (windows nt 10.0; wow64) applewebkit/537.36 (khtml, like gecko) chrome/53.0.2785.116 safari/537.36 qbcore/4.0.1301.400 qqbrowser/9.0.2524.400 mozilla/5.0 (windows nt 6.1; wow64) applewebkit/537.36 (khtml, like gecko) chrome/81.0.4044.138 safari/537.36 nettype/wifi micromessenger/7.0.20.1781(0x6700143b) windowswechat',
    expected: { name: 'WeChat', version: '4.0.1301.400', major: '4' },
  },
  {
    desc: 'Supposed not to be detected as WeChat',
    ua: 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.124 Safari/537.36 qblink wegame.exe WeGame/5.1.1.11100 QBCore/3.70.107.400 QQBrowser/9.0.2524.400',
    expected: { name: 'QQBrowser', version: '9.0.2524.400', major: '9' },
  },
  {
    desc: 'GSA on iOS',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_2 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) GSA/30.1.161623614 Mobile/14F89 Safari/602.1',
    expected: { name: 'GSA', version: '30.1.161623614', major: '30' },
  },
  {
    desc: 'Sogou Browser',
    ua: 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.221 Safari/537.36 SE 2.X MetaSr 1.0',
    expected: { name: 'Sogou Explorer', version: '1.0', major: '1' },
  },
  {
    desc: 'Sogou Mobile Browser',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_2 like Mac OS X) AppleWebKit/603.2.4 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30 SogouMSE,SogouMobileBrowser/3.7.4',
    expected: { name: 'Sogou Mobile', version: '3.7.4', major: '3' },
  },
  {
    desc: 'LieBao Browser',
    ua: 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.154 Safari/537.36 LBBROWSER',
    expected: { name: 'LBBROWSER' },
  },
  {
    desc: 'QQBrowserLite',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_1) AppleWebKit/602.2.14 (KHTML, like Gecko) Version/10.0.1 Safari/602.2.14 QQBrowserLite/1.1.0',
    expected: { name: 'QQBrowserLite', version: '1.1.0', major: '1' },
  },
  {
    desc: 'Brave Browser',
    ua: 'Brave/4.5.16 CFNetwork/893.13.1 Darwin/17.3.0 (x86_64)',
    expected: { name: 'Brave', version: '4.5.16', major: '4' },
  },
  {
    desc: 'Whale Browser',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.146 Whale/2.6.90.14 Safari/537.36',
    expected: { name: 'Whale', version: '2.6.90.14', major: '2' },
  },
  {
    desc: 'Electron',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Atom/1.41.0 Chrome/69.0.3497.128 Electron/4.2.7 Safari/537.36',
    expected: { name: 'Electron', version: '4.2.7', major: '4' },
  },
  {
    desc: 'IE11 on Windows 7 (ua length >255)',
    ua: 'Mozilla/5.0 (Windows NT 6.1; WOW64; APCPMS=^N201205020840572565478A37A6F9C41BD33F_9975^; Trident/7.0; SLCC2; .NET CLR 2.0.50727; .NET CLR 3.5.30729; .NET CLR 3.0.30729; Media Center PC 6.0; InfoPath.3; .NET4.0C; .NET4.0E; MARKANYEPS#25118; Zoom 3.6.0; rv:11.0) like Gecko',
    expected: { name: 'IE', version: '11.0', major: '11' },
  },
  {
    desc: 'LinkedIn',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [LinkedInApp]',
    expected: { name: 'LinkedIn' },
  },
  {
    desc: 'Links in Linux',
    ua: 'Links (2.xpre7; Linux 2.4.18 i586; x)',
    expected: { name: 'Links', version: '2.xpre7', major: '2' },
  },
  {
    desc: 'Links in Mac',
    ua: 'Links (2.1pre33; Darwin 8.11.0 Power Macintosh; 169x55)',
    expected: { name: 'Links', version: '2.1pre33', major: '2' },
  },
  {
    desc: 'Links in NetBSD',
    ua: 'Links (2.29; NetBSD 10.0 i386; GNU C 10.5; x)',
    expected: { name: 'Links', version: '2.29', major: '2' },
  },
  {
    desc: 'Links in FreeBSD',
    ua: 'Links (2.1pre15; FreeBSD 5.3-RELEASE i386; 196x84)',
    expected: { name: 'Links', version: '2.1pre15', major: '2' },
  },
  {
    desc: 'Safari including comma in minor version number',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6,2 Safari/605.1.15',
    expected: { name: 'Safari', version: '15.6,2', major: '15' },
  },
  {
    desc: 'Mobile Safari including comma in minor version number',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6,2 Mobile/15E148 Safari/604.1',
    expected: { name: 'Mobile Safari', version: '15.6,2', major: '15' },
  },
  {
    desc: 'Cobalt 23 Master',
    ua: 'Mozilla/5.0 (X11; Linux x86_64) Cobalt/23.master.0.0-devel (unlike Gecko) v8/8.8.278.8-jit gles Starboard/15',
    expected: { name: 'Cobalt', version: '23.0.0', major: '23' },
  },
  {
    desc: 'Cobalt 23 LTS',
    ua: 'Mozilla/5.0 (X11; Linux x86_64) Cobalt/23.lts.1.0-qa (unlike Gecko) v8/8.8.278.8-jit gles Starboard/15',
    expected: { name: 'Cobalt', version: '23.1.0', major: '23' },
  },
  {
    desc: 'Cobalt 11',
    ua: 'Mozilla/5.0 (X11; Linux x86_64) Cobalt/11.0-qa (unlike Gecko) Starboard/6',
    expected: { name: 'Cobalt', version: '11.0', major: '11' },
  },
  {
    desc: 'Cobalt 9',
    ua: 'Mozilla/5.0 (X11; Linux x86_64) Cobalt/9.0-qa (unlike Gecko) Starboard/4',
    expected: { name: 'Cobalt', version: '9.0', major: '9' },
  },
  {
    desc: 'KakaoTalk App Android',
    ua: 'Mozilla/5.0 (Linux; Android 12; SM-G988N Build/SP1A.210812.016; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/100.0.4896.79 Mobile Safari/537.36;KAKAOTALK 2409760',
    expected: { name: 'KAKAOTALK', version: '2409760', major: '2409760' },
  },
  {
    desc: 'KakaoStory App Android',
    ua: 'Mozilla/5.0 (Linux; Android 12; SM-G988N Build/SP1A.210812.016; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/100.0.4896.79 Mobile Safari/537.36 KAKAOSTORY/6.8.3_21046',
    expected: { name: 'KAKAOSTORY', version: '6.8.3_21046', major: '6' },
  },
  {
    desc: 'KakaoTalk App iOS',
    ua: 'Mozilla/5.0 (iPhone; CPU; iPhone OS 15_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 BizWebView KAKAOTALK 9.7.6',
    expected: { name: 'KAKAOTALK', version: '9.7.6', major: '9' },
  },
  {
    desc: 'Naver App Android',
    ua: 'Mozilla/5.0 (Linux; Android 12; SM-G988N Build/SP1A.210812.016; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/90.0.4430.232 Whale/1.0.0.0 Crosswalk/26.90.3.21 Mobile Safari/537.36 NAVER(inapp; search; 1010; 11.11.2)',
    expected: { name: 'NAVER', version: '11.11.2', major: '11' },
  },
  {
    desc: 'Naver App iOS',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0 Mobile/15E148 Safari/605.1 NAVER(inapp; search; 720; 10.25.0; 11PRO)',
    expected: { name: 'NAVER', version: '10.25.0', major: '10' },
  },
  {
    desc: 'Daum App Android',
    ua: 'Mozilla/5.0 (Linux; Android 11; SM-G970N Build/RP1A.200720.012; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/83.0.4103.106 Mobile Safari/537.36 DaumApps/7.5.0 DaumDevice/mobile',
    expected: { name: 'Daum', version: '7.5.0', major: '7' },
  },
  {
    desc: 'Daum App iOS',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Safari/605.1.15 Mobile/15E148 DaumApps/7.5.1 DaumDevice/mobile',
    expected: { name: 'Daum', version: '7.5.1', major: '7' },
  },
  {
    desc: 'TikTok',
    ua: 'Mozilla/5.0 (Linux; Android 11; 21061119AG Build/RP1A.200720.011; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/92.0.4515.131 Mobile Safari/537.36 trill_2022109040 JsSdk/1.0 NetType/MOBILE Channel/googleplay AppName/musical_ly app_version/21.9.4 ByteLocale/ru-RU ByteFullLocale/ru-RU Region/KG BytedanceWebview/d8a21c6',
    expected: { name: 'TikTok', version: '21.9.4', major: '21' },
  },
  {
    desc: 'TikTok',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 musical_ly_21.1.0 JsSdk/2.0 NetType/4G Channel/App Store ByteLocale/ru Region/RU ByteFullLocale/ru-RU isDarkMode/1 WKWebView/1 BytedanceWebview/d8a21c6',
    expected: { name: 'TikTok', version: '21.1.0', major: '21' },
  },
  {
    desc: 'TikTok',
    ua: 'Mozilla/5.0 (Linux; Android 10; STK-LX1 Build/HONORSTK-LX1; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/110.0.5481.153 Mobile Safari/537.36 musical_ly_2022803040 JsSdk/1.0 NetType/WIFI Channel/huaweiadsglobal_int AppName/musical_ly app_version/28.3.4 ByteLocale/en ByteFullLocale/en Region/IQ Spark/1.2.7-alpha.8 AppVersion/28.3.4 PIA/1.5.11 BytedanceWebview/d8a21c6',
    expected: { name: 'TikTok', version: '28.3.4', major: '28' },
  },
  {
    desc: 'Chrome Mobile',
    ua: 'Mozilla/5.0 (Linux; Android 7.1.2; Nexus 5X Build/N2G47W) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.83 Mobile Safari/537.36',
    expected: { name: 'Chrome', version: '58.0.3029.83', major: '58' },
  },
  {
    desc: 'Firefox Mobile',
    ua: 'Mozilla/5.0 (Linux; Android 7.1.2; Nexus 5X Build/N2G47W) AppleWebKit/537.36 (KHTML, like Gecko) FxiOS/7.5b3349 Mobile/14F89 Safari/603.2.4',
    expected: { name: 'Firefox', version: '7.5b3349', major: '7' },
  },
  {
    desc: 'Firefox Mobile',
    ua: 'Mozilla/5.0 (Android 5.0; Mobile; rv:41.0) Gecko/41.0 Firefox/41.0',
    expected: { name: 'Firefox', version: '41.0', major: '41' },
  },
  {
    desc: 'Snapchat',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Snapchat/12.33.0.36 (like Safari/8614.1.25.0.31, panda)',
    expected: { name: 'Snapchat', version: '12.33.0.36', major: '12' },
  },
  {
    desc: 'Twitter',
    ua: 'Mozilla/5.0 (Linux; Android 13; CPH2531 Build/SP1A.210812.016; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/123.0.6312.120 Mobile Safari/537.36 TwitterAndroid',
    expected: { name: 'Twitter' },
  },
  {
    desc: 'Twitter',
    ua: 'Mozilla/5.0 (iPad; CPU OS 15_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/19H12 Twitter for iPhone/10.34',
    expected: { name: 'Twitter', version: '10.34', major: '10' },
  },
]

export const cpuFixtures: UAFixture[] = [
  {
    desc: 'i686',
    ua: 'Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:19.0) Gecko/20100101 Firefox/19.0',
    expected: { architecture: 'ia32' },
  },
  {
    desc: 'i686',
    ua: 'Mozilla/5.0 (X11; U; CrOS i686 9.10.0; en-US) AppleWebKit/532.5 (KHTML, like Gecko) Chrome/4.0.253.0 Safari/532.5',
    expected: { architecture: 'ia32' },
  },
  {
    desc: 'i386',
    ua: 'Mozilla/5.0 (X11; U; FreeBSD i386; en-US; rv:1.7) Gecko/20040628 Epiphany/1.2.6',
    expected: { architecture: 'ia32' },
  },
  {
    desc: 'x86-64',
    ua: 'Opera/9.80 (X11; Linux x86_64; U; Linux Mint; en) Presto/2.2.15 Version/10.10',
    expected: { architecture: 'amd64' },
  },
  {
    desc: 'Vivaldi on Windows',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36 Vivaldi/6.0.2979.18',
    expected: { architecture: 'amd64' },
  },
  {
    desc: 'Vivaldi on Windows',
    ua: 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36 Vivaldi/6.0.2979.18',
    expected: { architecture: 'amd64' },
  },
  {
    desc: 'Vivaldi on Linux',
    ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36 Vivaldi/6.0.2979.18',
    expected: { architecture: 'amd64' },
  },
  {
    desc: 'Vivaldi on Linux',
    ua: 'Mozilla/5.0 (X11; Linux i686) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36 Vivaldi/6.0.2979.18',
    expected: { architecture: 'ia32' },
  },
  {
    desc: 'Xiaomi POCO M2 Pro',
    ua: 'Mozilla/5.0 (Linux; arm_64; Android 11; POCO M2 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 YaBrowser/22.11.7.42.00 SA/3 Mobile Safari/537.36',
    expected: { architecture: 'arm64' },
  },
  {
    desc: 'win64',
    ua: 'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.2; Win64; x64; Trident/6.0; .NET4.0E; .NET4.0C)',
    expected: { architecture: 'amd64' },
  },
  {
    desc: 'WOW64',
    ua: 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; WOW64; Trident/6.0)',
    expected: { architecture: 'amd64' },
  },
  {
    desc: 'ARM',
    ua: 'Mozilla/5.0 (Mobile; Windows Phone 8.1; Android 4.0; ARM; Trident/7.0; Touch; rv:11.0; IEMobile/11.0; NOKIA; Lumia 635) like iPhone OS 7_0_3 Mac OS X AppleWebKit/537 (KHTML, like Gecko) Mobile Safari/537',
    expected: { architecture: 'arm' },
  },
  {
    desc: 'ARMv61',
    ua: 'Mozilla/5.0 (X11; U; Linux armv61; en-US; rv:1.9.1b2pre) Gecko/20081015 Fennec/1.0a1',
    expected: { architecture: 'arm' },
  },
  {
    desc: 'ARMv7',
    ua: 'Mozilla/5.0 (Linux ARMv7) WebKitGTK+/3.4.9 vimprobable2',
    expected: { architecture: 'arm' },
  },
  {
    desc: 'ARMv7l',
    ua: 'Mozilla/5.0 (SMART-TV; X11; Linux armv7l) AppleWebKit/537.42 (KHTML, like Gecko) Chromium/25.0.1349.2 Chrome/25.0.1349.2 Safari/537.42',
    expected: { architecture: 'arm' },
  },
  {
    desc: 'ARMv7l',
    ua: 'Mozilla/5.0 (X11; CrOS armv7l 9765.85.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.123 Safari/537.36',
    expected: { architecture: 'arm' },
  },
  {
    desc: 'Nokia N900 Linux mobile',
    ua: 'Mozilla/5.0 (Maemo; Linux armv7l; rv:10.0) Gecko/20100101 Firefox/10.0 Fennec/10.0',
    expected: { architecture: 'arm' },
  },
  {
    desc: 'ARMEABI',
    ua: '[FBAN/FB4A;FBAV/237.0.0.44.120;FBBV/170693408;FBDM/{density=1.75,width=720,height=1280};FBLC/en_US;FBRV/172067074;FBCR/ ;FBMF/samsung;FBBD/samsung;FBPN/com.facebook.katana;FBDV/SM-S367VL;FBSV/9;FBBK/1;FBOP/19;FBCA/armeabi-v7a:armeabi;]',
    expected: { architecture: 'arm' },
  },
  {
    desc: 'ARMv8',
    ua: 'Mozilla/5.0 (X11; Linux armv8l; rv:45.0) Gecko/20100101 Firefox/45.0',
    expected: { architecture: 'arm64' },
  },
  {
    desc: 'AARCH64',
    ua: 'Mozilla/5.0 (X11; CrOS aarch64 13310.93.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.133 Safari/537.36',
    expected: { architecture: 'arm64' },
  },
  {
    desc: 'ARM64',
    ua: 'Mozilla/5.0 (Windows NT 10.0; ARM64; RM-1096) AppleWebKit/537.36 (KHTML like Gecko) Chrome/51.0.2704.79 Safari/537.36 Edge/14.14393',
    expected: { architecture: 'arm64' },
  },
  {
    desc: 'ARM64',
    ua: 'Mozilla/5.0 (Linux; arm_64; Android 9; HRY-LX1T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.97 YaBrowser/19.12.1.121.00 Mobile Safari/537.36',
    expected: { architecture: 'arm64' },
  },
  {
    desc: 'Google Search App',
    ua: 'Mozilla/5.0 (Linux; Android 9; JAT-LX1 Build/HONORJAT-LX1; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/83.0.4103.96 Mobile Safari/537.36 GoogleApp/11.11.10.21.arm',
    expected: { architecture: 'arm' },
  },
  {
    desc: 'Google Search App',
    ua: 'Mozilla/5.0 (Linux; Android 6.0; M5s Build/MRA58K; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/44.0.2403.147 Mobile Safari/537.36 GSA/12.40.17.23.arm64',
    expected: { architecture: 'arm64' },
  },
  {
    desc: 'Pocket PC',
    ua: 'Opera/9.7 (Windows Mobile; PPC; Opera Mobi/35166; U; en) Presto/2.2.1',
    expected: { architecture: 'arm' },
  },
  {
    desc: 'Mac PowerPC',
    ua: 'Mozilla/4.0 (compatible; MSIE 4.5; Mac_PowerPC)',
    expected: { architecture: 'ppc' },
  },
  {
    desc: 'Mac PowerPC',
    ua: 'Mozilla/4.0 (compatible; MSIE 5.17; Mac_PowerPC Mac OS; en)',
    expected: { architecture: 'ppc' },
  },
  {
    desc: 'Mac PowerPC',
    ua: 'iCab/2.9.5 (Macintosh; U; PPC; Mac OS X)',
    expected: { architecture: 'ppc' },
  },
  {
    desc: 'Mac OS X on PowerPC using Firefox',
    ua: 'Mozilla/5.0 (Macintosh; PPC Mac OS X x.y; rv:10.0) Gecko/20100101 Firefox/10.0',
    expected: { architecture: 'ppc' },
  },
  {
    desc: 'UltraSPARC',
    ua: 'Mozilla/5.0 (X11; U; SunOS sun4u; en-US; rv:1.9b5) Gecko/2008032620 Firefox/3.0b5',
    expected: { architecture: 'sparc' },
  },
  {
    desc: 'sparc64',
    ua: 'ELinks (0.4.3; NetBSD 3.0.2PATCH sparc64; 141x19)',
    expected: { architecture: 'sparc64' },
  },
  {
    desc: 'QuickTime',
    ua: 'QuickTime/7.5.6 (qtver=7.5.6;cpu=IA32;os=Mac 10.5.8)',
    expected: { architecture: 'ia32' },
  },
  {
    desc: 'XBMC',
    ua: 'XBMC/12.0 Git:20130127-fb595f2 (Windows NT 6.1;WOW64;Win64;x64; http://www.xbmc.org)',
    expected: { architecture: 'amd64' },
  },
  {
    desc: 'IRIX64',
    ua: 'Mozilla/4.8C-SGI [en] (X11; U; IRIX64 6.5 IP27',
    expected: { architecture: 'irix64' },
  },
  { desc: '68k', ua: "'Mozilla/1.1 (Macintosh; U; 68K)'", expected: { architecture: '68k' } },
  {
    desc: 'x86',
    ua: 'Mozilla/5.0 (Photon; U; QNX x86pc; en-US; rv:1.8.1.20) Gecko/20090127 BonEcho/2.0.0.20',
    expected: { architecture: 'ia32' },
  },
]

export const deviceFixtures: UAFixture[] = [
  {
    desc: 'K',
    ua: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Mobile Safari/537.36',
    expected: { model: 'K', type: 'mobile' },
  },
  {
    desc: 'Advan M4',
    ua: 'Mozilla/5.0 (Linux; U; Android 6.0; ADVAN M4 Build/MRA58K; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/44.0.2403.119 Mobile Safari/537.36 OPR/28.0.2254.119214',
    expected: { vendor: 'ADVAN', model: 'M4', type: 'mobile' },
  },
  {
    desc: 'Advan S40',
    ua: 'Mozilla/5.0 (Linux; Android 7.0; ADVAN S40 Build/NRD90M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.88 Mobile Safari/537.36 EdgA/79.0.309.58',
    expected: { vendor: 'ADVAN', model: 'S40', type: 'mobile' },
  },
  {
    desc: 'Advan Sketsa 2',
    ua: 'Mozilla/5.0 (Linux; Android 11; ADVAN 1011) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.101 Safari/537.36',
    expected: { vendor: 'ADVAN', model: '1011', type: 'mobile' },
  },
  {
    desc: 'Archos 5',
    ua: 'Mozilla/5.0 (Linux; U; Android 1.6; fr-fr; Archos5 Build/Donut) AppleWebKit/528.5+ (KHTML, like Gecko) Version/3.1.2 Mobile Safari/525.20.1',
    expected: { vendor: 'Archos', model: '5', type: 'tablet' },
  },
  {
    desc: 'Archos 40b Titanium Surround',
    ua: 'Mozilla/5.0 (Linux; Android 4.2.2; Archos 40b Titanium Surround Build/JDQ39) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/34.0.1847.114 Mobile Safari/537.36',
    expected: { vendor: 'Archos', model: '40b Titanium Surround', type: 'mobile' },
  },
  {
    desc: 'Archos 40c Titanium v2',
    ua: 'Mozilla/5.0 (Linux; Android 4.4.2; ARCHOS 40C TIv2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Mobile Safari/537.36',
    expected: { vendor: 'Archos', model: '40C TIv2', type: 'mobile' },
  },
  {
    desc: 'Archos 45 Neon',
    ua: 'Mozilla/5.0 (Linux; Android 4.4.2; Archos 45 Neon Build/KOT49H) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.83 Mobile Safari/537.36',
    expected: { vendor: 'Archos', model: '45 Neon', type: 'mobile' },
  },
  {
    desc: 'Archos 45 Neon',
    ua: 'Mozilla/5.0 (Linux; Android 4.4.2; AC45NE Build/KOT49H) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.152 YaBrowser/15.6.2311.6088.00 Mobile Safari/537.36',
    expected: { vendor: 'Archos', model: 'AC45NE', type: 'mobile' },
  },
  {
    desc: 'Archos 45B Helium',
    ua: 'Mozilla/5.0 (Linux; Android 7.0; AC45BHE Build/KTU84P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.109 Mobile Safari/537.36',
    expected: { vendor: 'Archos', model: 'AC45BHE', type: 'mobile' },
  },
  {
    desc: 'Archos 45B Titanium',
    ua: 'Mozilla/5.0 (Linux; Android 4.4.2; Archos 45B Titanium) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Mobile Safari/537.36',
    expected: { vendor: 'Archos', model: '45B Titanium', type: 'mobile' },
  },
  {
    desc: 'Archos 50 Cesium',
    ua: 'Mozilla/5.0 (Windows Phone 10.0; Android 4.2.1; ARCHOS; AC50CE) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2486.0 Mobile Safari/537.36 Edge/13.10586',
    expected: { vendor: 'Archos', model: 'AC50CE', type: 'mobile' },
  },
  {
    desc: 'Archos 50B Helium 4G',
    ua: 'Mozilla/5.0 (Linux; Android 4.4.4; AC50BHE Build/KTU84P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Mobile Safari/537.36',
    expected: { vendor: 'Archos', model: 'AC50BHE', type: 'mobile' },
  },
  {
    desc: 'Archos 55 diamond Selfie',
    ua: 'Mozilla/5.0 (Linux; Android 6.0.1; Archos 55 diamond Selfie Build/MMB29M; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/68.0.3440.91 Mobile Safari/537.36',
    expected: { vendor: 'Archos', model: '55 diamond Selfie', type: 'mobile' },
  },
  {
    desc: 'Archos 80 G9',
    ua: 'Mozilla/5.0 (Linux; U; Android 4.0.4; zh-tw; ARCHOS 80G9 Build/IMM76D) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Safari/534.30',
    expected: { vendor: 'Archos', model: '80G9', type: 'tablet' },
  },
  {
    desc: 'Archos 80 Xenon',
    ua: 'Mozilla/5.0 (Linux; Android 4.1.2; Archos 80 Xenon Build/JZO54K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.99 Safari/537.36 OPR/50.6.2426.201126',
    expected: { vendor: 'Archos', model: '80 Xenon', type: 'tablet' },
  },
  {
    desc: 'Archos 97c Platinum',
    ua: 'Mozilla/5.0 (Linux; Android 6.0; Archos 97c Platinum Build/MRA58K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.84 Safari/537.36',
    expected: { vendor: 'Archos', model: '97c Platinum', type: 'tablet' },
  },
  {
    desc: 'Archos 101 Access 3G V2',
    ua: 'Mozilla/5.0 (Linux; Android 7.0; Archos Access 101 3G V2 Build/NRD90M; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/114.0.5735.130 Safari/537.36[FBAN/EMA;FBLC/pt_PT;FBAV/360.0.0.7.53;]',
    expected: { vendor: 'Archos', model: 'Access 101 3G V2', type: 'tablet' },
  },
  {
    desc: 'Archos 101 Oxygen 4G',
    ua: 'Mozilla/5.0 (Linux; Android 8.1.0; Archos 101 Oxygen 4G Build/O11019; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/103.0.5060.71 Safari/537.36 [FB_IAB/FB4A;FBAV/374.0.0.20.109;]',
    expected: { vendor: 'Archos', model: '101 Oxygen 4G', type: 'tablet' },
  },
  {
    desc: 'Archos 101 Platinum 3G V2',
    ua: 'Mozilla/5.0 (Linux; Android 7.0; AC101PL3GV2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36',
    expected: { vendor: 'Archos', model: 'AC101PL3GV2', type: 'tablet' },
  },
  {
    desc: 'Archos 101B Helium 4G',
    ua: 'Mozilla/5.0 (Linux; Android 6.0; AC101BHE Build/MRA58K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.91 Safari/537.36',
    expected: { vendor: 'Archos', model: 'AC101BHE', type: 'tablet' },
  },
  {
    desc: 'Archos 101s Oxygen Ardoiz',
    ua: 'Mozilla/5.0 (Linux; Android 9; Archos Oxygen 101S ARDOIZ Build/PPR1.180610.011; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.102 Safari/537.36',
    expected: { vendor: 'Archos', model: 'Oxygen 101S ARDOIZ', type: 'tablet' },
  },
  {
    desc: 'Archos GAMEPAD2',
    ua: 'Mozilla/5.0 (Linux; Android 4.2.2; ARCHOS GAMEPAD2 Build/JDQ39) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/28.0.1500.94 Safari/537.36',
    expected: { vendor: 'Archos', model: 'GAMEPAD2', type: 'tablet' },
  },
  {
    desc: 'Archos Hello 7',
    ua: 'Mozilla/5.0 (Linux; Android 8.1.0; Archos Hello 7 Build/O11019; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/103.0.5060.53 Safari/537.36 GoogleApp/13.24.9.26.arm64',
    expected: { vendor: 'Archos', model: 'Hello 7', type: 'tablet' },
  },
  {
    desc: 'Archos Sense 101 X',
    ua: 'Mozilla/5.0 (Linux; arm; Android 7.0; Archos Sense 101 X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.117 YaBrowser/20.2.0.215.01 Safari/537.36',
    expected: { vendor: 'Archos', model: 'Sense 101 X', type: 'tablet' },
  },
  {
    desc: 'Archos T101 FHD WiFi',
    ua: 'Mozilla/5.0 (Linux; Android 13; ARCHOS T101 FHD WiFi Build/T00624; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.6367.159 Safari/537.36',
    expected: { vendor: 'Archos', model: 'T101 FHD WiFi', type: 'tablet' },
  },
  {
    desc: 'Archos Tikeasy 10d',
    ua: 'Mozilla/5.0 (Linux; Android 13; Tikeasy 10d Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.6778.260 Safari/537.36',
    expected: { vendor: 'Archos', model: 'Tikeasy 10d', type: 'tablet' },
  },
  {
    desc: 'Archos T96 WIFI',
    ua: 'Mozilla/5.0 (Linux; Android 11; ARCHOS T96 WIFI_EEA Build/RP1A.201005.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/102.0.5005.78 Safari/537.36',
    expected: { vendor: 'Archos', model: 'T96 WIFI_EEA', type: 'tablet' },
  },
  {
    desc: 'Archos X67 5G',
    ua: 'Mozilla/5.0 (Linux; Android 10; X67 5G Build/QP1A.190711.020; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.58 Mobile Safari/537.36',
    expected: { vendor: 'Archos', model: 'X67 5G', type: 'tablet' },
  },
  {
    desc: 'ASUS Nexus 7',
    ua: 'Mozilla/5.0 (Linux; Android 4.4.2; Nexus 7 Build/KOT49H) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/32.0.1700.99 Safari/537.36',
    expected: { vendor: 'ASUS', model: 'Nexus 7', type: 'tablet' },
  },
  {
    desc: 'ASUS Padfone',
    ua: 'Mozilla/5.0 (Linux; Android 4.1.1; PadFone 2 Build/JRO03L) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.117 Safari/537.36',
    expected: { vendor: 'ASUS', model: 'PadFone', type: 'tablet' },
  },
  {
    desc: 'ASUS ZenPad 10',
    ua: 'Mozilla/5.0 (Linux; Android 6.0; P00C Build/MRA58K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.76 Safari/537.36',
    expected: { vendor: 'ASUS', model: 'P00C', type: 'tablet' },
  },
  {
    desc: 'ASUS ZenPad Z8s',
    ua: 'Mozilla/5.0 (Linux; Android 7.0; ASUS_P00J) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.111 Safari/537.36\n',
    expected: { vendor: 'ASUS', model: 'P00J', type: 'tablet' },
  },
  {
    desc: 'ASUS ROG',
    ua: 'Mozilla/5.0 (Linux; Android 8.1; ZS600KL Build/OPM1.171019.026) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.126 Mobile Safari/537.36',
    expected: { vendor: 'ASUS', model: 'ZS600KL', type: 'mobile' },
  },
  {
    desc: 'ASUS ROG II',
    ua: 'Mozilla/5.0 (Linux; Android 9; ASUS_I001DA Build/PKQ1.190414.001; xx-xx) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/74.0.3729.136 Mobile Safari/537.36',
    expected: { vendor: 'ASUS', model: 'I001DA', type: 'mobile' },
  },
  {
    desc: 'ASUS Zenfone 2',
    ua: 'Mozilla/5.0 (Linux; Android 5.0; ASUS ZenFone 2 Build/LRX22C) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/37.0.0.0 Mobile Safari/537.36',
    expected: { vendor: 'ASUS', model: 'ZenFone 2', type: 'mobile' },
  },
  {
    desc: 'ASUS Zenfone 3 Deluxe',
    ua: 'Mozilla/5.0 (Linux; Android 6.0; ASUS_Z016D Build/MXB48T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2987.132 Mobile Safari/537.36',
    expected: { vendor: 'ASUS', model: 'Z016D', type: 'mobile' },
  },
  {
    desc: 'ASUS Zenfone 5',
    ua: 'Mozilla/5.0 (Linux; Android 8.0; ZE620KL Build/OPR1.170623.032) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.158 Mobile Safari/537.36',
    expected: { vendor: 'ASUS', model: 'ZE620KL', type: 'mobile' },
  },
  {
    desc: 'ASUS Zenfone 7',
    ua: 'Mozilla/5.0 (Linux; Android 10; ASUS_I002D) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.81 Mobile Safari/537.36',
    expected: { vendor: 'ASUS', model: 'I002D', type: 'mobile' },
  },
  {
    desc: 'ASUS Zenfone 7 Pro',
    ua: 'Mozilla/5.0 (Linux; Android 10; ZS671KS) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.72 Mobile Safari/537.36',
    expected: { vendor: 'ASUS', model: 'ZS671KS', type: 'mobile' },
  },
  {
    desc: 'ASUS Zenfone Max Pro',
    ua: 'Mozilla/5.0 (Linux; Android 9; ZB602KL) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.116 Mobile Safari/537.36',
    expected: { vendor: 'ASUS', model: 'ZB602KL', type: 'mobile' },
  },
  {
    desc: 'ASUS Zenfone Max Pro (M1)',
    ua: 'Mozilla/5.0 (Linux; Android 8.1; ASUS_X00TD Build/OPM1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.137 Mobile Safari/537.36',
    expected: { vendor: 'ASUS', model: 'X00TD', type: 'mobile' },
  },
  {
    desc: 'ASUS Zenfone Max M2',
    ua: 'Mozilla/5.0 (Linux; Android 8.1; ASUS_X01AD) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.99 Mobile Safari/537.36',
    expected: { vendor: 'ASUS', model: 'X01AD', type: 'mobile' },
  },
  {
    desc: 'ASUS Zenfone Max Pro M2',
    ua: 'Mozilla/5.0 (Linux; Android 8.1; ASUS_X01BDA) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.99 Mobile Safari/537.36',
    expected: { vendor: 'ASUS', model: 'X01BDA', type: 'mobile' },
  },
  {
    desc: 'ASUS Zenfone Go',
    ua: 'Mozilla/5.0 (Linux; Android 6.0; ASUS_X009DA Build/MMB29M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Mobile Safari/537.36',
    expected: { vendor: 'ASUS', model: 'X009DA', type: 'mobile' },
  },
  {
    desc: 'ASUS ZenWatch',
    ua: 'Mozilla/5.0 (Linux; Android 5.0.1; ASUS ZenWatch Build/LWX48S) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/19.77.34.5 Mobile Safari/537.36',
    expected: { vendor: 'ASUS', model: 'ZenWatch', type: 'wearable' },
  },
  {
    desc: 'Acer Iconia A1-810',
    ua: 'Mozilla/5.0 (Linux; Android 4.2.2; A1-810 Build/JDQ39) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.109 Safari/537.36',
    expected: { vendor: 'Acer', model: 'A1-810', type: 'tablet' },
  },
  {
    desc: 'BlackBerry Priv',
    ua: 'User-Agent: Mozilla/5.0 (Linux; Android 5.1.1; STV100-1 Build/LMY47V; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/46.0.2490.76 Mobile Safari/537.36',
    expected: { vendor: 'BlackBerry', model: 'STV100-1', type: 'mobile' },
  },
  {
    desc: 'BlackBerry Keyone',
    ua: 'Mozilla/5.0 (Linux; Android 8.1.0; BBB100-1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.111 Mobile Safari/537.36',
    expected: { vendor: 'BlackBerry', model: 'BBB100-1', type: 'mobile' },
  },
  {
    desc: 'BlackBerry Key2',
    ua: 'Mozilla/5.0 (Linux; Android 8.1.0; BBF100-1 Build/OPM1.171019.026) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.91 Mobile Safari/537.36',
    expected: { vendor: 'BlackBerry', model: 'BBF100-1', type: 'mobile' },
  },
  {
    desc: 'BlackBerry Key2 LE',
    ua: 'User-Agent: Mozilla/5.0 (Linux; Android 8.1.0; BBE100-1 Build/OPM1.171019.026) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497 Mobile Safari/537.36',
    expected: { vendor: 'BlackBerry', model: 'BBE100-1', type: 'mobile' },
  },
  {
    desc: 'Blackview 4900Pro',
    ua: 'Mozilla/5.0 (Linux; Android 12; BV4900Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Mobile Safari/537.36',
    expected: { model: 'BV4900Pro', type: 'mobile' },
  },
  {
    desc: 'Cat B15Q',
    ua: 'Mozilla/5.0 (Linux; Android 4.4.2; B15Q) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.80 Mobile Safari/537.36',
    expected: { vendor: 'Cat', model: 'B15Q', type: 'mobile' },
  },
  {
    desc: 'Cat B35',
    ua: 'Mozilla/5.0 (Mobile; CAT B35; rv:48.0) Gecko/48.0 Firefox/48.0 KAIOS/2.5.1',
    expected: { vendor: 'Cat', model: 'B35', type: 'mobile' },
  },
  {
    desc: 'Cat S22 Flip',
    ua: 'Mozilla/5.0 (Linux; Android 11; S22 FLIP Build/RKQ1.210416.002) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.165 Mobile Safari/537.36',
    expected: { vendor: 'Cat', model: 'S22 FLIP', type: 'mobile' },
  },
  {
    desc: 'Cat S62 Pro',
    ua: 'Mozilla/5.0 (Linux; Android 11; S62 Pro Build/RKQ1.210406.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/94.0.4606.85 Mobile Safari/537.36 GSA/12.34.17.23.arm64',
    expected: { vendor: 'Cat', model: 'S62 Pro', type: 'mobile' },
  },
  {
    desc: 'Desktop (IE11 with Tablet string)',
    ua: 'Mozilla/5.0 (Windows NT 6.3; WOW64; Trident/7.0; .NET4.0E; .NET4.0C; .NET CLR 3.5.30729; .NET CLR 2.0.50727; .NET CLR 3.0.30729; Tablet PC 2.0; GWX:MANAGED; rv:11.0) like Gecko',
    expected: {},
  },
  {
    desc: 'Mobile (DuckDuckGo mobile browser)',
    ua: 'Mozilla/5.0 (Linux; Android 8.1.0) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/92.0.4515.131 Mobile DuckDuckGo/5 Safari/537.36',
    expected: { type: 'mobile' },
  },
  {
    desc: 'Energizer Energy 400',
    ua: 'Mozilla/5.0 (Linux; Android 6.0; Energy400 Build/MRA58K test-keys; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/66.0.3359.158 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/172.0.0.66.93;]',
    expected: { vendor: 'Energizer', model: 'Energy400', type: 'mobile' },
  },
  {
    desc: 'Energizer Energy 400S',
    ua: 'Mozilla/5.0 (Linux; Android 6.0; Energy 400S Build/MRA58K; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/68.0.3440.85 Mobile Safari/537.36',
    expected: { vendor: 'Energizer', model: 'Energy 400S', type: 'mobile' },
  },
  {
    desc: 'Energizer Ultimate 65G',
    ua: 'Mozilla/5.0 (Linux; Android 14; Energizer Ultimate 65G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Mobile Safari/537.36',
    expected: { vendor: 'Energizer', model: 'Ultimate 65G', type: 'mobile' },
  },
  {
    desc: 'Essential PH-1',
    ua: 'Mozilla/5.0 (Linux; Android 9; PH-1 Build/PPR1.180905.036) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.86 Mobile Safari/537.36',
    expected: { vendor: 'Essential', model: 'PH-1', type: 'mobile' },
  },
  {
    desc: 'Fairphone 1U',
    ua: 'Mozilla/5.0 (Linux; U; Android 4.2.2; FP1U Build/JDQ39) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
    expected: { vendor: 'Fairphone', model: 'FP1U', type: 'mobile' },
  },
  {
    desc: 'Fairphone 2',
    ua: 'Mozilla/5.0 (Linux; Android 7.1.2; FP2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.136 Mobile Safari/537.36',
    expected: { vendor: 'Fairphone', model: 'FP2', type: 'mobile' },
  },
  {
    desc: 'Fairphone 3',
    ua: 'Mozilla/5.0 (Linux; Android 9; FP3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.93 Mobile Safari/537.36',
    expected: { vendor: 'Fairphone', model: 'FP3', type: 'mobile' },
  },
  {
    desc: 'HMD Pulse',
    ua: 'Mozilla/5.0 (Linux; Android 14; HMD Pulse) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
    expected: { vendor: 'HMD', model: 'Pulse', type: 'mobile' },
  },
  {
    desc: 'HMD Pulse Plus',
    ua: 'Mozilla/5.0 (Linux; Android 14; HMD Pulse Plus) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
    expected: { vendor: 'HMD', model: 'Pulse Plus', type: 'mobile' },
  },
  {
    desc: 'HMD Pulse Pro',
    ua: 'Mozilla/5.0 (Linux; Android 14; HMD Pulse Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36',
    expected: { vendor: 'HMD', model: 'Pulse Pro', type: 'mobile' },
  },
  {
    desc: 'Honor MagicPad 13 WiFi',
    ua: 'Mozilla/5.0 (Linux; U; Android 13; zh-CN; GDI-W09 Build/HONORGDI-W09) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/100.0.4896.58 UCBrowser/16.3.9.1290 Mobile Safari/537.36',
    expected: { vendor: 'Honor', model: 'GDI-W09', type: 'tablet' },
  },
  {
    desc: 'Honor Pad 2',
    ua: 'Mozilla/5.0 (Linux; U; Android 6.0.1; en-nz; JDN-W09 Build/HuaweiMediaPad) AppleWebKit/537.36 (KHTML, like Gecko)Version/4.0 Chrome/37.0.0.0 MQQBrowser/6.0 Mobile Safari/537.36',
    expected: { vendor: 'Honor', model: 'JDN-W09', type: 'tablet' },
  },
  {
    desc: 'Honor Pad 2',
    ua: 'Mozilla/5.0 (Linux; U; Android 9; zh-Hans-CN; JDN2-W09HN Build/HUAWEIJDN2-W09HN) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/78.0.3904.108 Quark/4.6.6.164 Mobile Safari/537.36',
    expected: { vendor: 'Honor', model: 'JDN2-W09HN', type: 'tablet' },
  },
  {
    desc: 'Honor Pad 7 10.1',
    ua: 'Mozilla/5.0 (Linux; Android 12; AGM3-AL09HN Build/HONORAGM3-AL09HN; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.6778.46 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/490.0.0.63.82;IABMV/1;]',
    expected: { vendor: 'Honor', model: 'AGM3-AL09HN', type: 'tablet' },
  },
  {
    desc: 'Honor Pad 8 12.0',
    ua: 'Mozilla/5.0 (Linux; Android 12; HEY-W09 Build/HONORHEY-W09; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.107 Safari/537.36',
    expected: { vendor: 'Honor', model: 'HEY-W09', type: 'tablet' },
  },
  {
    desc: 'Honor Pad 9 12.1',
    ua: 'Mozilla/5.0 (Linux; Android 13; HEY2-N09 Build/HONORHEY2-N09; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.107 Safari/537.36 [FB_IAB/FB4A;FBAV/465.0.0.63.83;]',
    expected: { vendor: 'Honor', model: 'HEY2-N09', type: 'tablet' },
  },
  {
    desc: 'Honor Pad 9 12.1 WiFi',
    ua: 'Mozilla/5.0 (Linux; Android 14; HEY2-W09 Build/HONORHEY2-W09; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.6668.102 Safari/537.36 [FB_IAB/FB4A;FBAV/489.0.0.66.81;IABMV/1;]',
    expected: { vendor: 'Honor', model: 'HEY2-W09', type: 'tablet' },
  },
  {
    desc: 'Honor Pad V7 Pro 11',
    ua: 'Mozilla/5.0 (Linux; Android 12; BRT-AN09) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36 EdgA/109.0.1518.53',
    expected: { vendor: 'Honor', model: 'BRT-AN09', type: 'tablet' },
  },
  {
    desc: 'Honor Pad V7 Pro 11 WiFi',
    ua: 'Mozilla/5.0 (Linux; U; Android 12; zh-Hans-CN; BRT-W09 Build/HONORBRT-W09) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/100.0.4896.58 Quark/6.5.0.336 Mobile Safari/537.36',
    expected: { vendor: 'Honor', model: 'BRT-W09', type: 'tablet' },
  },
  {
    desc: 'Honor Pad X6',
    ua: 'Mozilla/5.0 (Linux; Android 10; AGR-W09HN Build/HUAWEIAGR-W09HN; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/76.0.3809.89 Mobile Safari/537.36 T7/12.9 SP-engine/2.28.0 baiduboxapp/12.9.0.11 (Baidu; P1 10) NABar/1.0',
    expected: { vendor: 'Honor', model: 'AGR-W09HN', type: 'tablet' },
  },
  {
    desc: 'Honor Pad X7 8 LTE',
    ua: 'Mozilla/5.0 (Linux; Android 10; KOB2-AL00HN; HMSCore 6.0.0.306) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.93 HuaweiBrowser/11.1.3.300 Mobile Safari/537.36',
    expected: { vendor: 'Honor', model: 'KOB2-AL00HN', type: 'tablet' },
  },
  {
    desc: 'Honor Pad X7 8 WiFi',
    ua: 'Mozilla/5.0 (Linux; Android 10; KOB2-W09HN; HMSCore 6.1.0.314) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.105 HuaweiBrowser/12.0.0.301 Mobile Safari/537.36',
    expected: { vendor: 'Honor', model: 'KOB2-W09HN', type: 'tablet' },
  },
  {
    desc: 'Honor Pad X8 Lite',
    ua: 'Mozilla/5.0 (Linux; Android 12; AGM-W09HN) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    expected: { vendor: 'Honor', model: 'AGM-W09HN', type: 'tablet' },
  },
  {
    desc: 'Honor Pad X9 11.5 LTE',
    ua: 'Mozilla/5.0 (Linux; Android 13; ELN-L09 Build/HONORELN-L09; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.86 Mobile Safari/537.36[FBAN/EMA;FBLC/zh_CN;FBAV/432.0.0.9.110;FBCX/modulariab;]',
    expected: { vendor: 'Honor', model: 'ELN-L09', type: 'tablet' },
  },
  {
    desc: 'Honor Pad X9 11.5 WiFi',
    ua: 'Mozilla/5.0 (Linux; Android 13; ELN-W09 Build/HONORELN-W09; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.86 Safari/537.36',
    expected: { vendor: 'Honor', model: 'ELN-W09', type: 'tablet' },
  },
  {
    desc: 'HTC Desire 820',
    ua: 'Mozilla/5.0 (Linux; Android 6.0.1; HTC Desire 820 Build/MMB29M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.76 Mobile Safari/537.36',
    expected: { vendor: 'HTC', model: 'Desire 820', type: 'mobile' },
  },
  {
    desc: 'HTC Evo Shift 4G',
    ua: 'Mozilla/5.0 (Linux; U; Android 2.3.4; en-us; Sprint APA7373KT Build/GRJ22) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0',
    expected: { vendor: 'Sprint', model: 'APA7373KT', type: 'mobile' },
  },
  {
    desc: 'HTC Nexus 9',
    ua: 'Mozilla/5.0 (Linux; Android 5.0; Nexus 9 Build/LRX21R) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/36.0.1985.143 Mobile Crosswalk/7.36.154.13 Safari/537.36',
    expected: { vendor: 'HTC', model: 'Nexus 9', type: 'tablet' },
  },
  {
    desc: 'Huawei Honor',
    ua: 'Mozilla/5.0 (Linux; U; Android 2.3; xx-xx; U8860 Build/HuaweiU8860) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1',
    expected: { vendor: 'Huawei', model: 'U8860', type: 'mobile' },
  },
  {
    desc: 'Huawei Honor 20 Pro',
    ua: 'Mozilla/5.0 (Linux; Android 10; YAL-L41) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.127 Mobile Safari/537.36',
    expected: { vendor: 'Huawei', model: 'YAL-L41', type: 'mobile' },
  },
  {
    desc: 'Huawei Honor 20 Pro',
    ua: 'Mozilla/5.0 (Linux; Android 10; YAL-AL10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.127 Mobile Safari/537.36',
    expected: { vendor: 'Huawei', model: 'YAL-AL10', type: 'mobile' },
  },
  {
    desc: 'Huawei Nexus 6P',
    ua: 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 6P Build/MTC19V) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.81 Mobile Safari/537',
    expected: { vendor: 'Huawei', model: 'Nexus 6P', type: 'mobile' },
  },
  {
    desc: 'Huawei P10',
    ua: 'Mozilla/5.0 (Linux; Android 7.0; VTR-L09 Build/HUAWEIVTR-L09; xx-xx) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/56.0.2924.87 Mobile Safari/537.36',
    expected: { vendor: 'Huawei', model: 'VTR-L09', type: 'mobile' },
  },
  {
    desc: 'Huawei Y3II',
    ua: 'Mozilla/5.0 (Linux; U; Android 5.1; xx-xx; HUAWEI LUA-L03 Build/HUAWEILUA-L03) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/39.0.0.0 Mobile Safari/537.36',
    expected: { vendor: 'Huawei', model: 'LUA-L03', type: 'mobile' },
  },
  {
    desc: 'HUAWEI MediaPad C5 8',
    ua: 'Mozilla/5.0 (Linux; Android 7.0; MON-AL19B Build/HUAWEIMON-AL19; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/63.0.3239.83 Mobile Safari/537.36 T7/11.7 baiduboxapp/11.7.0.10 (Baidu; P1 7.0)',
    expected: { vendor: 'Huawei', model: 'MON-AL19B', type: 'tablet' },
  },
  {
    desc: 'HUAWEI MediaPad M2 10.1',
    ua: 'Mozilla/5.0 (Linux; Android 5.1.1; HUAWEI M2-A01L Build/HUAWEIM2-A01L; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/95.0.4638.74 Safari/537.36[FBAN/EMA;FBLC/fr_FR;FBAV/421.0.0.14.100;]',
    expected: { vendor: 'Huawei', model: 'M2-A01L', type: 'tablet' },
  },
  {
    desc: 'HUAWEI MediaPad M3',
    ua: 'Mozilla/5.0 (Linux; U; Android 6.0; en-US; BTV-DL09 Build/HUAWEIBEETHOVEN-DL09) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/40.0.2214.89 UCBrowser/11.5.0.1015 Mobile Safari/537.36',
    expected: { vendor: 'Huawei', model: 'BTV-DL09', type: 'tablet' },
  },
  {
    desc: 'HUAWEI MediaPad M3 8',
    ua: 'Mozilla/5.0 (Linux; Android 7.0; HUAWEI BTV-W09 Build/NMF26F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.96 Mobile Safari/537.36 AlohaBrowser/3.1.1',
    expected: { vendor: 'Huawei', model: 'BTV-W09', type: 'tablet' },
  },
  {
    desc: 'HUAWEI MediaPad M3 Lite',
    ua: 'Mozilla/5.0 (Linux; Android 7.0; CPN-L09 Build/HUAWEICPN-L09; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/87.0.4280.141 Mobile Safari/537.36[FBAN/EMA;FBLC/ru_RU;FBAV/233.0.0.12.118;]',
    expected: { vendor: 'Huawei', model: 'CPN-L09', type: 'tablet' },
  },
  {
    desc: 'HUAWEI MediaPad M3 Lite',
    ua: 'Mozilla/5.0 (Linux; Android 7.0; CPN-W09 Build/HUAWEICPN-W09; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/103.0.5060.71 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/374.0.0.20.109;]',
    expected: { vendor: 'Huawei', model: 'CPN-W09', type: 'tablet' },
  },
  {
    desc: 'HUAWEI MediaPad M3 Lite 10',
    ua: 'Mozilla/5.0 (Linux; Android 7.0; BAH-L09) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.80 Safari/537.36',
    expected: { vendor: 'Huawei', model: 'BAH-L09', type: 'tablet' },
  },
  {
    desc: 'HUAWEI MediaPad M5 10.8',
    ua: 'Mozilla/5.0 (Linux; Android 9; CMR-W09 Build/HUAWEICMR-W09; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.102 Safari/537.36 Line/14.18.1/IAB',
    expected: { vendor: 'Huawei', model: 'CMR-W09', type: 'tablet' },
  },
  {
    desc: 'HUAWEI MediaPad M5 Lite',
    ua: 'Mozilla/5.0 (Linux; Android 8.0.0; BAH2-W19 Build/HUAWEIBAH2-W19; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/83.0.4103.106 Safari/537.36',
    expected: { vendor: 'Huawei', model: 'BAH2-W19', type: 'tablet' },
  },
  {
    desc: 'HUAWEI MediaPad M5 Lite',
    ua: 'Mozilla/5.0 (Linux; Android 9; JDN2-W09 Build/HUAWEIJDN2-W09; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/90.0.4430.210 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/318.0.0.39.154;]',
    expected: { vendor: 'Huawei', model: 'JDN2-W09', type: 'tablet' },
  },
  {
    desc: 'HUAWEI MediaPad M5 Lite',
    ua: 'Mozilla/5.0 (Linux; Android 9; JDN2-AL50 Build/HUAWEIJDN2-AL50; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/76.0.3809.89 Mobile Safari/537.36 T7/12.13.0 SP-engine/2.29.0 matrixstyle/0 lite baiduboxapp/5.8.0.10 (Baidu; P1 9) NABar/1.',
    expected: { vendor: 'Huawei', model: 'JDN2-AL50', type: 'tablet' },
  },
  {
    desc: 'HUAWEI MediaPad M5 8.4',
    ua: 'Mozilla/5.0 (Linux; Android 9; SHT-W09 Build/HUAWEISHT-W09; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.87 Mobile Safari/537.36',
    expected: { vendor: 'Huawei', model: 'SHT-W09', type: 'tablet' },
  },
  {
    desc: 'HUAWEI MediaPad M5',
    ua: 'Mozilla/5.0 (Linux; Android 9; SHT-AL09 Build/HUAWEISHT-AL09; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/89.0.4389.90 Mobile Safari/537.36',
    expected: { vendor: 'Huawei', model: 'SHT-AL09', type: 'tablet' },
  },
  {
    desc: 'HUAWEI MediaPad M6 10.8',
    ua: 'Mozilla/5.0 (Linux; Android 14; SCM-W09) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6612.143 Mobile Safari/537.36',
    expected: { vendor: 'Huawei', model: 'SCM-W09', type: 'tablet' },
  },
  {
    desc: 'HUAWEI MediaPad M6 8.4',
    ua: 'Mozilla/5.0 (Linux; Android 9; VRD-W09; HMSCore 6.14.0.321; GMSCore 22.26.15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.196 HuaweiBrowser/15.0.4.312 Mobile Safari/537.36',
    expected: { vendor: 'Huawei', model: 'VRD-W09', type: 'tablet' },
  },
  {
    desc: 'HUAWEI MediaPad T5',
    ua: 'Mozilla/5.0 (Linux; Android 8.0.0; AGS2-L09 Build/HUAWEIAGS2-L09; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/84.0.4147.125 Safari/537.36',
    expected: { vendor: 'Huawei', model: 'AGS2-L09', type: 'tablet' },
  },
  {
    desc: 'HUAWEI MediaPad T10',
    ua: 'Mozilla/5.0 (Linux; U; Android 10; en-US; AGR-L09 Build/HUAWEIAGR-L09) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/78.0.3904.108 UCBrowser/13.3.8.1305 Mobile Safari/537.36',
    expected: { vendor: 'Huawei', model: 'AGR-L09', type: 'tablet' },
  },
  {
    desc: 'HUAWEI MediaPad T10',
    ua: 'Mozilla/5.0 (Linux; Android 10; AGR-W09 Build/HUAWEIAGR-W09; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/78.0.3904.108 Safari/537.36',
    expected: { vendor: 'Huawei', model: 'AGR-W09', type: 'tablet' },
  },
  {
    desc: 'HUAWEI MediaPad T10s',
    ua: 'Mozilla/5.0 (Linux; Android 10; AGS3-W09 Build/HUAWEIAGS3-W09; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/78.0.3904.108 Safari/537.36',
    expected: { vendor: 'Huawei', model: 'AGS3-W09', type: 'tablet' },
  },
  {
    desc: 'HUAWEI MediaPad T 8.0',
    ua: 'Mozilla/5.0 (Linux; Android 10; KOB2-L09 Build/HUAWEIKOB2-L09; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/92.0.4515.105 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/396.0.0.21.104;]',
    expected: { vendor: 'Huawei', model: 'KOB2-L09', type: 'tablet' },
  },
  {
    desc: 'HUAWEI MediaPad T 8.0',
    ua: 'Mozilla/5.0 (Linux; Android 10; KOB2-W09 Build/HUAWEIKOB2-W09; wv) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.105 Mobile Safari/537.36 HuaweiBrowser/15.0.4.312 HMSCore/6.14.0.301',
    expected: { vendor: 'Huawei', model: 'KOB2-W09', type: 'tablet' },
  },
  {
    desc: 'HUAWEI MediaPad T1 10',
    ua: 'Mozilla/5.0 (Linux; Android 4.4.4; T1-A21w Build/HuaweiMediaPad) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/33.0.0.0 Safari/537.36 SputnikBrowser/1.2.8.161',
    expected: { vendor: 'Huawei', model: 'T1-A21w', type: 'tablet' },
  },
  {
    desc: 'HUAWEI MediaPad T1 10',
    ua: 'Mozilla/5.0 (Linux; Android 5.1.1; T1-A23L Build/HuaweiMediaPad; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/43.0.2357.121 Mobile Safari/537.36 BingWeb/6.9.10',
    expected: { vendor: 'Huawei', model: 'T1-A23L', type: 'tablet' },
  },
  {
    desc: 'HUAWEI MediaPad T1 10',
    ua: 'Mozilla/5.0 (Linux; Android 5.1.1; T1-A21L Build/HuaweiMediaPad) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.93 Safari/537.36',
    expected: { vendor: 'Huawei', model: 'T1-A21L', type: 'tablet' },
  },
  {
    desc: 'HUAWEI MediaPad T1 7',
    ua: 'Mozilla/5.0 (Linux; 4.4.2; T1-701u) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
    expected: { vendor: 'Huawei', model: 'T1-701u', type: 'tablet' },
  },
  {
    desc: 'HUAWEI MediaPad T1 8',
    ua: 'Mozilla/5.0 (Linux; U; Android 9.0; MediaPad T1 8.0 Build/HuaweiMediaPad) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Safari/534.30 OPR/28.0.2254.119224',
    expected: { vendor: 'Huawei', model: 'MediaPad T1 8.0', type: 'tablet' },
  },
  {
    desc: 'HUAWEI MediaPad T10 9.7',
    ua: 'Mozilla/5.0 (Linux; U; Android 10; en-US; AGRK-L09 Build/HUAWEIAGRK-L09) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/78.0.3904.108 UCBrowser/13.6.0.1315 Mobile Safari/537.36',
    expected: { vendor: 'Huawei', model: 'AGRK-L09', type: 'tablet' },
  },
  {
    desc: 'HUAWEI MediaPad T10 9.7 WiFi',
    ua: 'Mozilla/5.0 (Linux; Android 10; AGRK-W09; HMSCore 6.14.0.321) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.196 HuaweiBrowser/15.0.4.312 Safari/537.36',
    expected: { vendor: 'Huawei', model: 'AGRK-W09', type: 'tablet' },
  },
  {
    desc: 'HUAWEI MediaPad T10s 10.1 LTE',
    ua: 'Mozilla/5.0 (Linux; Android 10; AGS3K-L09 Build/HUAWEIAGS3K-L09; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/92.0.4515.105 Safari/537.36 [FB_IAB/FB4A;FBAV/362.0.0.27.109;]',
    expected: { vendor: 'Huawei', model: 'AGS3K-L09', type: 'tablet' },
  },
  {
    desc: 'HUAWEI MediaPad T10s 10.1 WiFi',
    ua: 'Mozilla/5.0 (Linux; Android 10; AGS3K-W09; HMSCore 6.14.0.321) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.196 HuaweiBrowser/15.0.4.312 Safari/537.36',
    expected: { vendor: 'Huawei', model: 'AGS3K-W09', type: 'tablet' },
  },
  {
    desc: 'HUAWEI MediaPad T2 10.0 Pro',
    ua: 'Mozilla/5.0 (Linux; Android 6.0.1; 605HW Build/HuaweiMediaPad; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/102.0.5005.78 Safari/537.36 [FB_IAB/FB4A;FBAV/436.0.0.35.101;]',
    expected: { vendor: 'Huawei', model: '605HW', type: 'tablet' },
  },
  {
    desc: 'HUAWEI MediaPad T2 7.0 Pro',
    ua: 'Mozilla/5.0 (Linux; Android 6.0; BGO-DL09 Build/HuaweiBAGGIO; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/106.0.5249.126 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/407.0.0.30.97;]',
    expected: { vendor: 'Huawei', model: 'BGO-DL09', type: 'tablet' },
  },
  {
    desc: 'HUAWEI MediaPad T3 10',
    ua: 'Mozilla/5.0 (Linux; Android 7.0; AGS-W09 Build/HUAWEIAGS-W09; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/78.0.3904.90 Safari/537.36 GSA/10.83.10.21.arm64',
    expected: { vendor: 'Huawei', model: 'AGS-W09', type: 'tablet' },
  },
  {
    desc: 'HUAWEI MediaPad T3 7',
    ua: 'Mozilla/5.0 (Linux; Android 7.0; BG2-U03 Build/HUAWEIBG2-U03; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/84.0.4147.111 Mobile Safari/537.36',
    expected: { vendor: 'Huawei', model: 'BG2-U03', type: 'tablet' },
  },
  {
    desc: 'HUAWEI MediaPad T3 8',
    ua: 'Mozilla/5.0 (Linux; Android 7.0; KOB-W09 Build/HUAWEIKOB-W09; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/69.0.3497.100 Safari/537.36 [FB_IAB/Orca-Android;FBAV/354.0.0.10.113;]',
    expected: { vendor: 'Huawei', model: 'KOB-W09', type: 'tablet' },
  },
  {
    desc: 'HUAWEI MediaPad T5 10',
    ua: 'Mozilla/5.0 (Linux; Android 8.0.0; AGS2-W09 Build/HUAWEIAGS2-W09; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.107 Safari/537.36 Flipboard/4.3.31/5486,4.3.31.5486',
    expected: { vendor: 'Huawei', model: 'AGS2-W09', type: 'tablet' },
  },
  {
    desc: 'HUAWEI MediaPad X2',
    ua: 'Mozilla/5.0 (Linux; Android 8.0; GEM-703L Build/HUAWEIGEM-703L; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/57.0.2987.132 MQQBrowser/6.2 TBS/043906 Mobile Safari/537.36 MicroMessenger/6.6.3.1260(0x26060339) NetType/WIFI Language/zh_',
    expected: { vendor: 'Huawei', model: 'GEM-703L', type: 'tablet' },
  },
  {
    desc: 'Huawei MatePad 10.4',
    ua: 'Mozilla/5.0 (Linux; Android 10; HarmonyOS; BAH3-W09; HMSCore 6.14.0.322) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.196 HuaweiBrowser/15.0.4.312 Mobile Safari/537.36',
    expected: { vendor: 'Huawei', model: 'BAH3-W09', type: 'tablet' },
  },
  {
    desc: 'Huawei MatePad 10.4',
    ua: 'Mozilla/5.0 (Linux; Android 10; HarmonyOS; BAH3-L09; HMSCore 6.14.0.322) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.196 HuaweiBrowser/15.0.4.312 Safari/537.36',
    expected: { vendor: 'Huawei', model: 'BAH3-L09', type: 'tablet' },
  },
  {
    desc: 'Huawei MatePad 10.4 WiFi',
    ua: 'Mozilla/5.0 (Linux; Android 10; BAH3-W59 Build/HUAWEIBAH3-W59; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/92.0.4515.105 Safari/537.36HiSearch/22.0.6.315',
    expected: { vendor: 'Huawei', model: 'BAH3-W59', type: 'tablet' },
  },
  {
    desc: 'Huawei MatePad 10.4 (2022)',
    ua: 'Mozilla/5.0 (Linux; Android 10; BAH4-L09 Build/HUAWEIBAH4-L09; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/92.0.4515.105 Safari/537.36',
    expected: { vendor: 'Huawei', model: 'BAH4-L09', type: 'tablet' },
  },
  {
    desc: 'Huawei MatePad 10.4 (2022) WiFi',
    ua: 'Mozilla/5.0 (Linux; Android 10; HarmonyOS; BAH4-W09; HMSCore 6.14.0.322) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.196 HuaweiBrowser/15.0.4.312 Safari/537.36',
    expected: { vendor: 'Huawei', model: 'BAH4-W09', type: 'tablet' },
  },
  {
    desc: 'Huawei MatePad 10.4 SE',
    ua: 'Mozilla/5.0 (Linux; Android 12; AGS5-L09 Build/HUAWEIAGS5-L09; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/99.0.4844.88 Safari/537.36',
    expected: { vendor: 'Huawei', model: 'AGS5-L09', type: 'tablet' },
  },
  {
    desc: 'Huawei MatePad 10.4 SE WiFi',
    ua: 'Mozilla/5.0 (Linux; Android 12; AGS5-W09 Build/HUAWEIAGS5-W09; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/99.0.4844.88 Safari/537.36 [FB_IAB/FB4A;FBAV/480.0.0.54.88;]',
    expected: { vendor: 'Huawei', model: 'AGS5-W09', type: 'tablet' },
  },
  {
    desc: 'Huawei MatePad 11 (2023) WiFi',
    ua: 'Mozilla/5.0 (Linux; U; Android 12; zh-Hans-CN; DBR-W10 Build/HUAWEIDBR-W10) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/100.0.4896.58 Quark/6.9.6.501 Mobile Safari/537.36',
    expected: { vendor: 'Huawei', model: 'DBR-W10', type: 'tablet' },
  },
  {
    desc: 'Huawei MatePad 11 WiFi',
    ua: 'Mozilla/5.0 (Linux; U; Android 12; zh-cn; DBY-W09 Build/HUAWEIDBY-W09) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/109.0.5414.86 MQQBrowser/14.6 Mobile Safari/537.36 COVC/046801',
    expected: { vendor: 'Huawei', model: 'DBY-W09', type: 'tablet' },
  },
  {
    desc: 'Huawei MatePad 11.5 Air WiFi',
    ua: 'Mozilla/5.0 (Linux; U; Android 12; zh-Hans-CN; DBY2-W00 Build/HUAWEIDBY2-W00) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/100.0.4896.58 Quark/7.3.8.663 Mobile Safari/537.36',
    expected: { vendor: 'Huawei', model: 'DBY2-W00', type: 'tablet' },
  },
  {
    desc: 'Huawei MatePad 11.5 LTE',
    ua: 'Mozilla/5.0 (Linux; Android 12; HarmonyOS; BTK-AL09; HMSCore 6.14.0.322) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.196 HuaweiBrowser/15.0.4.312 Safari/537.36',
    expected: { vendor: 'Huawei', model: 'BTK-AL09', type: 'tablet' },
  },
  {
    desc: 'Huawei MatePad 11.5 S WiFi',
    ua: 'Mozilla/5.0 (Linux; Android 12; HarmonyOS; TGR-W09; HMSCore 6.14.0.322; GMSCore 0.3.3.1.240913) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.88 HuaweiBrowser/14.0.2.317 Safari/537.36',
    expected: { vendor: 'Huawei', model: 'TGR-W09', type: 'tablet' },
  },
  {
    desc: 'Huawei MatePad 11.5 WiFi',
    ua: 'Mozilla/5.0 (Linux; Android 12; HarmonyOS; BTK-W09; HMSCore 6.14.0.322; GMSCore 214816056) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.196 HuaweiBrowser/15.0.4.312 Safari/537.36',
    expected: { vendor: 'Huawei', model: 'BTK-W09', type: 'tablet' },
  },
  {
    desc: 'Huawei MatePad C5 8',
    ua: 'Mozilla/5.0 (Linux; Android 7.0; MON-W19 Build/HUAWEIMON-W19; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/63.0.3239.111 Mobile Safari/537.36 [Pinterest/Android]',
    expected: { vendor: 'Huawei', model: 'MON-W19', type: 'tablet' },
  },
  {
    desc: 'Huawei MatePad Pro 11',
    ua: 'Mozilla/5.0 (Linux; arm_64; Android 12; GOT-AL09) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 YaBrowser/23.5.5.60.01 Safari/537.36',
    expected: { vendor: 'Huawei', model: 'GOT-AL09', type: 'tablet' },
  },
  {
    desc: 'Huawei MatePad Pro 11 WiFi',
    ua: 'Mozilla/5.0 (Linux; Android 12; GOT-W09 Build/HUAWEIGOT-W09; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/97.0.4692.98 Safari/537.36 T7/13.19 BDOS/1.0 (HarmonyOS 3.0.0) SP-engine/2.57.0 baiduboxapp/13.19.0.12 (Baidu; P1 12) NABar/1.0',
    expected: { vendor: 'Huawei', model: 'GOT-W09', type: 'tablet' },
  },
  {
    desc: 'Huawei MatePad Pro 12.6 WiFi',
    ua: 'Mozilla/5.0 (Linux; Android 10; WGR-W09 Build/HUAWEIWGR-W09; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/92.0.4515.105 Safari/537.36[FBAN/EMA;FBLC/en_US;FBAV/412.0.0.8.106;]',
    expected: { vendor: 'Huawei', model: 'WGR-W09', type: 'tablet' },
  },
  {
    desc: 'Huawei MatePad SE 11 WiFi',
    ua: 'Mozilla/5.0 (Linux; Android 10; HarmonyOS; AGS6-W09; HMSCore 6.12.2.309) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.93 HuaweiBrowser/11.1.5.315 Safari/537.36',
    expected: { vendor: 'Huawei', model: 'AGS6-W09', type: 'tablet' },
  },
  {
    desc: 'Huawei MatePad Pro 13.2',
    ua: 'Mozilla/5.0 (Linux; Android 12; HarmonyOS; PCE-W29; HMSCore 6.14.0.322) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.196 HuaweiBrowser/15.0.4.312 Safari/537.36',
    expected: { vendor: 'Huawei', model: 'PCE-W29', type: 'tablet' },
  },
  {
    desc: 'Huawei MatePad T 10',
    ua: 'Mozilla/5.0 (Linux; Android 10; AGR-L09; HMSCore 5.0.4.301) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.106 HuaweiBrowser/11.0.3.304 Safari/537.36',
    expected: { vendor: 'Huawei', model: 'AGR-L09', type: 'tablet' },
  },
  {
    desc: 'Huawei MatePad T10s',
    ua: 'Mozilla/5.0 (Linux; U; Android 10; zh-cn; AGS3-AL00 Build/HUAWEIAGS3-AL00) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/77.0.3865.120 MQQBrowser/11.4 Mobile Safari/537.36 COVC/045530',
    expected: { vendor: 'Huawei', model: 'AGS3-AL00', type: 'tablet' },
  },
  {
    desc: 'Huawei MatePad T10s WiFi',
    ua: 'Mozilla/5.0 (Linux; U; Android 10; AGS3-W09 Build/HUAWEIAGS3-W09; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/88.0.4324.93 Safari/537.36 OPR/60.0.2254.59405',
    expected: { vendor: 'Huawei', model: 'AGS3-W09', type: 'tablet' },
  },
  {
    desc: 'Huawei MatePad T8 8 LTE',
    ua: 'Mozilla/5.0 (Linux; U; Android 10; KOB2K-L09 Build/HUAWEIKOB2K-L09; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/78.0.3904.108 Safari/537.36 OPR/83.0.2254.73002',
    expected: { vendor: 'Huawei', model: 'KOB2K-L09', type: 'tablet' },
  },
  {
    desc: 'Huawei M3',
    ua: 'Mozilla/5.0 (Linux; Android 7.0; BTV-W09) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.116 Mobile Safari/537.36',
    expected: { vendor: 'Huawei', model: 'BTV-W09', type: 'tablet' },
  },
  {
    desc: 'Huawei Mate 10 Pro',
    ua: 'Mozilla/5.0 (Linux; Android 8.0; BLA-L29 Build/HUAWEIBLA-L29) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3236.6 Mobile Safari/537.36',
    expected: { vendor: 'Huawei', model: 'BLA-L29', type: 'mobile' },
  },
  {
    desc: 'Huawei Mate X',
    ua: 'Mozilla/5.0 (Linux; Android 9; TAH-AN00) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.111 Safari/537.36',
    expected: { vendor: 'Huawei', model: 'TAH-AN00', type: 'mobile' },
  },
  {
    desc: 'Huawei Mate X2',
    ua: 'Mozilla/5.0 (Linux; Android 10; TET-AN00) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.96 Mobile Safari/537.36',
    expected: { vendor: 'Huawei', model: 'TET-AN00', type: 'mobile' },
  },
  {
    desc: 'Huawei Mate 20 X',
    ua: 'Mozilla/5.0 (Linux; Android 9; EVR-L29 Build/HUAWEIEVR-L29; xx-xx) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/70.0.3538.110 Mobile Safari/537.36',
    expected: { vendor: 'Huawei', model: 'EVR-L29', type: 'mobile' },
  },
  {
    desc: 'Huawei Mate 20 Pro',
    ua: 'Mozilla/5.0 (Linux; Android 9; LYA-L09) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.90 Mobile Safari/537.36',
    expected: { vendor: 'Huawei', model: 'LYA-L09', type: 'mobile' },
  },
  {
    desc: 'Huawei Mate 20 Pro',
    ua: 'Mozilla/5.0 (Linux; Android 9; LYA-AL00) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.90 Mobile Safari/537.36',
    expected: { vendor: 'Huawei', model: 'LYA-AL00', type: 'mobile' },
  },
  {
    desc: 'Huawei Mate 20 Pro',
    ua: 'Mozilla/5.0 (Linux; Android 9; LYA-AL10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.90 Mobile Safari/537.36',
    expected: { vendor: 'Huawei', model: 'LYA-AL10', type: 'mobile' },
  },
  {
    desc: 'Huawei Mate 20 Pro',
    ua: 'Mozilla/5.0 (Linux; Android 9; LYA-L0C) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.90 Mobile Safari/537.36',
    expected: { vendor: 'Huawei', model: 'LYA-L0C', type: 'mobile' },
  },
  {
    desc: 'Huawei Mate 20 Pro',
    ua: 'Mozilla/5.0 (Linux; Android 9; LYA-L29) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.90 Mobile Safari/537.36',
    expected: { vendor: 'Huawei', model: 'LYA-L29', type: 'mobile' },
  },
  {
    desc: 'Huawei Mate 20 Pro',
    ua: 'Mozilla/5.0 (Linux; Android 9; LYA-TL00) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.90 Mobile Safari/537.36',
    expected: { vendor: 'Huawei', model: 'LYA-TL00', type: 'mobile' },
  },
  {
    desc: 'Huawei Mate 50 Pro',
    ua: 'Mozilla/5.0 (Linux; Android 12; DCO-LX9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    expected: { vendor: 'Huawei', model: 'DCO-LX9', type: 'mobile' },
  },
  {
    desc: 'Huawei P20 Lite',
    ua: 'Mozilla/5.0 (Linux; Android 8.0.0; ANE-LX1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.143 Mobile Safari/537.36',
    expected: { vendor: 'Huawei', model: 'ANE-LX1', type: 'mobile' },
  },
  {
    desc: 'Huawei P20',
    ua: 'Mozilla/5.0 (Linux; Android 8.1.0; EML-L29) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.157 Mobile Safari/537.36',
    expected: { vendor: 'Huawei', model: 'EML-L29', type: 'mobile' },
  },
  {
    desc: 'Huawei P20 Pro',
    ua: 'Mozilla/5.0 (Linux; Android 9; CLT-L29) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.90 Mobile Safari/537.36',
    expected: { vendor: 'Huawei', model: 'CLT-L29', type: 'mobile' },
  },
  {
    desc: 'Huawei P30',
    ua: 'Mozilla/5.0 (Linux; Android 9; ELE-L29) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.90 Mobile Safari/537.36',
    expected: { vendor: 'Huawei', model: 'ELE-L29', type: 'mobile' },
  },
  {
    desc: 'Huawei P30 Pro',
    ua: 'Mozilla/5.0 (Linux; Android 9; VOG-L29) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.143 Mobile Safari/537.36',
    expected: { vendor: 'Huawei', model: 'VOG-L29', type: 'mobile' },
  },
  {
    desc: 'Huawei P40',
    ua: 'Mozilla/5.0 (Linux; Android 10; ANA-AN00 Build/HUAWEIANA-AN00; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/76.0.3809.89 Mobile Safari/537.36 T7/11.26 SP-engine/2.22.0 baiduboxapp/11.26.0.10 (Baidu; P1 10) NABar/1.0',
    expected: { vendor: 'Huawei', model: 'ANA-AN00', type: 'mobile' },
  },
  {
    desc: 'Huawei P40 Pro',
    ua: 'Mozilla/5.0 (Linux; Android 10; ELS-AN00 Build/HUAWEIELS-AN00; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/78.0.3904.108 Mobile Safari/537.36 mailapp/6.0.0',
    expected: { vendor: 'Huawei', model: 'ELS-AN00', type: 'mobile' },
  },
  {
    desc: 'Huawei 30 Pro+',
    ua: 'Mozilla/5.0 (Linux; Android 10; EBG-AN10 Build/HUAWEIEBG-AN10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.86 Mobile Safari/537.36 EdgA/42.0.0.2741',
    expected: { vendor: 'Huawei', model: 'EBG-AN10', type: 'mobile' },
  },
  {
    desc: 'Huawei 30S',
    ua: 'Mozilla/5.0 (Linux; Android 10; CDY-AN90 Build/HUAWEICDY-AN90; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/78.0.3904.108 Mobile Safari/537.36 mailapp/5.8.0',
    expected: { vendor: 'Huawei', model: 'CDY-AN90', type: 'mobile' },
  },
  {
    desc: 'Huawei Nova 5T',
    ua: 'Mozilla/5.0 (Linux; Android 10; YAL-L21) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Mobile Safari/537.36',
    expected: { vendor: 'Huawei', model: 'YAL-L21', type: 'mobile' },
  },
  {
    desc: 'Huawei Nova 5T',
    ua: 'Mozilla/5.0 (Linux; Android 10; YAL-L61) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Mobile Safari/537.36',
    expected: { vendor: 'Huawei', model: 'YAL-L61', type: 'mobile' },
  },
  {
    desc: 'Huawei Nova 5T',
    ua: 'Mozilla/5.0 (Linux; Android 10; YAL-L71) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Mobile Safari/537.36',
    expected: { vendor: 'Huawei', model: 'YAL-L71', type: 'mobile' },
  },
  {
    desc: 'Huawei Nova 5T',
    ua: 'Mozilla/5.0 (Linux; Android 10; YAL-L61D) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Mobile Safari/537.36',
    expected: { vendor: 'Huawei', model: 'YAL-L61D', type: 'mobile' },
  },
  {
    desc: 'Huawei Nova 5T',
    ua: 'Mozilla/5.0 (Linux; Android 10; YALE-L61A) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Mobile Safari/537.36',
    expected: { vendor: 'Huawei', model: 'YALE-L61A', type: 'mobile' },
  },
  {
    desc: 'Huawei Nova 5T',
    ua: 'Mozilla/5.0 (Linux; Android 10; YALE-L61D) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Mobile Safari/537.36',
    expected: { vendor: 'Huawei', model: 'YALE-L61D', type: 'mobile' },
  },
  {
    desc: 'Huawei Nova 5T',
    ua: 'Mozilla/5.0 (Linux; Android 10; YALE-L71A) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Mobile Safari/537.36',
    expected: { vendor: 'Huawei', model: 'YALE-L71A', type: 'mobile' },
  },
  {
    desc: 'Huawei Enjoy10e',
    ua: 'Dalvik/2.1.0 (Linux; U; Android 10; MED-AL00 Build/HUAWEIMED-AL00)',
    expected: { vendor: 'Huawei', model: 'MED-AL00', type: 'mobile' },
  },
  {
    desc: 'Huawei Honor 6A',
    ua: 'Mozilla/5.0 (Linux; Android 7.0; DLI-L22 Build/HONORDLI-L22; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/79.0.3945.116 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/252.0.0.22.355;]',
    expected: { vendor: 'Honor', model: 'DLI-L22', type: 'mobile' },
  },
  {
    desc: 'Huawei Honor 7',
    ua: 'Mozilla/5.0 (Linux; Android 6.0; PLK-L01 Build/HONORPLK-L01; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/79.0.3945.116 Mobile Safari/537.36',
    expected: { vendor: 'Honor', model: 'PLK-L01', type: 'mobile' },
  },
  {
    desc: 'Huawei 10 Lite',
    ua: 'Mozilla/5.0 (Linux; Android 9; HRY-LX1 Build/HONORHRY-LX1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.91 Mobile Safari/537.36',
    expected: { vendor: 'Honor', model: 'HRY-LX1', type: 'mobile' },
  },
  {
    desc: 'Huawei Y7 2018',
    ua: 'Mozilla/5.0 (Linux; Android 8.0.0; LDN-L01) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.62 Mobile Safari/537.36',
    expected: { vendor: 'Huawei', model: 'LDN-L01', type: 'mobile' },
  },
  {
    desc: 'Huawei Honor 8X',
    ua: 'Mozilla/5.0 (Linux; Android 9; JSN-L21) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.132 Mobile Safari/537.36',
    expected: { vendor: 'Huawei', model: 'JSN-L21', type: 'mobile' },
  },
  {
    desc: 'Huawei Y6 2019',
    ua: 'Mozilla/5.0 (Linux; Android 9; MRD-LX1N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.110 Mobile Safari/537.36',
    expected: { vendor: 'Huawei', model: 'MRD-LX1N', type: 'mobile' },
  },
  {
    desc: 'Huawei Y9 2019',
    ua: 'Mozilla/5.0 (Linux; Android 9; JKM-LX2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.136 Mobile Safari/537.36',
    expected: { vendor: 'Huawei', model: 'JKM-LX2', type: 'mobile' },
  },
  {
    desc: 'Huawei Y5',
    ua: 'Mozilla/5.0 (Linux; Android 9; AMN-LX3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.116 Mobile Safari/537.36',
    expected: { vendor: 'Huawei', model: 'AMN-LX3', type: 'mobile' },
  },
  {
    desc: 'Huawei Y7p',
    ua: 'Mozilla/5.0 (Linux; Android 9; ART-L29) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.92 Mobile Safari/537.36',
    expected: { vendor: 'Huawei', model: 'ART-L29', type: 'mobile' },
  },
  {
    desc: 'Huawei Mate 20 Lite',
    ua: 'Mozilla/5.0 (Linux; Android 8.1.0; SNE-LX1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.116 Mobile Safari/537.36',
    expected: { vendor: 'Huawei', model: 'SNE-LX1', type: 'mobile' },
  },
  {
    desc: 'Huawei P10 Lite',
    ua: 'Mozilla/5.0 (Linux; Android 8.0.0; WAS-LX1A) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.90 Mobile Safari/537.36',
    expected: { vendor: 'Huawei', model: 'WAS-LX1A', type: 'mobile' },
  },
  {
    desc: 'Huawei Y5 Lite 2018',
    ua: 'Mozilla/5.0 (Linux; Android 8.1.0; DRA-LX5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Mobile Safari/537.36',
    expected: { vendor: 'Huawei', model: 'DRA-LX5', type: 'mobile' },
  },
  {
    desc: 'Huawei Honor 8C',
    ua: 'Mozilla/5.0 (Linux; Android 8.1.0; BKK-LX2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.136 Mobile Safari/537.36',
    expected: { vendor: 'Huawei', model: 'BKK-LX2', type: 'mobile' },
  },
  {
    desc: 'IMO FEEL A2',
    ua: 'Mozilla/5.0 (Linux; Android 5.1; IMO FEEL A2 Build/LMY47I; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/49.0.2623.105 Mobile Safari/537.36',
    expected: { vendor: 'IMO', model: 'FEEL A2', type: 'mobile' },
  },
  {
    desc: 'IMO Q2',
    ua: 'Mozilla/5.0 (Linux; Android 5.1; IMO Q2 Build/LMY47D; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/65.0.3325.109 Mobile Safari/537.36 GSA/7.22.24.21.arm',
    expected: { vendor: 'IMO', model: 'Q2', type: 'mobile' },
  },
  {
    desc: 'IMO S2',
    ua: 'Mozilla/5.0 (Linux; Android 8.1.0; IMO S2 Build/O11019; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/80.0.3987.162 Mobile Safari/537.36',
    expected: { vendor: 'IMO', model: 'S2', type: 'mobile' },
  },
  {
    desc: 'IMO Tab X9',
    ua: 'Mozilla/5.0 (Linux; U; Android 4.0.3; id-id; IMO TAB X9 Build/IML74K) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Safari/534.30',
    expected: { vendor: 'IMO', model: 'TAB X9', type: 'tablet' },
  },
  {
    desc: 'Infinix Hot 7 Pro',
    ua: 'Mozilla/5.0 (Linux; Android 9; Infinix X625C) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Mobile Safari/537.36',
    expected: { vendor: 'Infinix', model: 'X625C', type: 'mobile' },
  },
  {
    desc: 'Infinix Hot 10T',
    ua: 'Mozilla/5.0 (Linux; Android 11; Infinix X689C) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Mobile Safari/537.36',
    expected: { vendor: 'Infinix', model: 'X689C', type: 'mobile' },
  },
  {
    desc: 'Infinix Hot 11s',
    ua: 'Mozilla/5.0 (Linux; Android 11; Infinix X6812 Build/RP1A.200720.011; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/111.0.5563.116 Mobile Safari/537.36',
    expected: { vendor: 'Infinix', model: 'X6812', type: 'mobile' },
  },
  {
    desc: 'Infinix Smart 5',
    ua: 'Mozilla/5.0 (Linux; Android 10; Infinix X657C) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Mobile Safari/537.36',
    expected: { vendor: 'Infinix', model: 'X657C', type: 'mobile' },
  },
  {
    desc: 'Infinix XPad',
    ua: 'Mozilla/5.0 (Linux; Android 14; Infinix X1101B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.99 Safari/537.36 [FB_IAB/FB4A;FBAV/489.0.0.66.81;IABMV/1;]',
    expected: { vendor: 'Infinix', model: 'X1101B', type: 'tablet' },
  },
  {
    desc: 'Infinix Zero 5G',
    ua: 'Mozilla/5.0 (Linux; Android 12; Infinix X6815B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Mobile Safari/537.36',
    expected: { vendor: 'Infinix', model: 'X6815B', type: 'mobile' },
  },
  {
    desc: 'Apple Desktop',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Safari/605.1.15',
    expected: { vendor: 'Apple', model: 'Macintosh' },
  },
  {
    desc: 'Apple HomePod',
    ua: 'AppleCoreMedia/1.0.0.15D61 (HomePod; U; CPU OS 11_2_5 like Mac OS X; en_us)',
    expected: { vendor: 'Apple', model: 'HomePod', type: 'embedded' },
  },
  {
    desc: 'Apple Watch',
    ua: 'atc/1.0 watchOS/7.3.3 model/Watch4,2 hwp/t8006 build/18S830 (6; dt:191)',
    expected: { vendor: 'Apple', model: 'watch', type: 'wearable' },
  },
  {
    desc: 'iPad using UCBrowser',
    ua: 'Mozilla/5.0 (iPad; U; CPU OS 11_2 like Mac OS X; zh-CN; iPad5,3) AppleWebKit/534.46 (KHTML, like Gecko) UCBrowser/3.0.1.776 U3/ Mobile/10A403 Safari/7543.48.3',
    expected: { vendor: 'Apple', model: 'iPad', type: 'tablet' },
  },
  {
    desc: 'iPad Air',
    ua: 'Mozilla/5.0 (iPad; CPU OS 12_4_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBDV/iPad4,1;FBMD/iPad;FBSN/iOS;FBSV/12.4.5;FBSS/2;FBID/tablet;FBLC/en_US;FBOP/5;FBCR/]',
    expected: { vendor: 'Apple', model: 'iPad', type: 'tablet' },
  },
  {
    desc: 'iPad using Facebook Browser',
    ua: 'Mozilla/5.0 (iPad; CPU OS 14_4_2 like Mac OS X) WebKit/8610 (KHTML, like Gecko) Mobile/18D70 [FBAN/FBIOS;FBDV/iPad7,11;FBMD/iPad;FBSN/iOS;FBSV/14.4.2;FBSS/2;FBID/tablet;FBLC/en_US;FBOP/5]',
    expected: { vendor: 'Apple', model: 'iPad', type: 'tablet' },
  },
  {
    desc: 'iPod',
    ua: 'Mozilla/5.0 (iPod touch; CPU iPhone OS 7_0_4 like Mac OS X) AppleWebKit/537.51.1 (KHTML, like Gecko) Version/7.0 Mobile/11B554a Safari/9537.53',
    expected: { vendor: 'Apple', model: 'iPod touch', type: 'mobile' },
  },
  {
    desc: 'JVC LT-43V55LFA Smart TV',
    ua: 'Mozilla/5.0 (Linux armv7l) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36 OPR/40.0.2207.0 OMI/4.9.0.237.DOM3-OPT.245 Model/Vestel-MB211 VSTVB MB200 HbbTV/1.2.1 (; JVC; MB211; 3.19.4.2; _TV_NT72563_2017 SmartTvA/3.0.0',
    expected: { vendor: 'JVC', model: 'MB211', type: 'smarttv' },
  },
  {
    desc: 'JVC LT-43V65LUA Smart TV',
    ua: 'Mozilla/5.0 (Linux armv7l) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36 OPR/40.0.2207.0 OMI/4.9.0.237.DOM3-OPT.245 Model/Vestel-MB130 VSTVB MB100 HbbTV/1.2.1 (; JVC; MB130; 5.7.20.0; _TV_G10_2017;) SmartTvA/3.0.0',
    expected: { vendor: 'JVC', model: 'MB130', type: 'smarttv' },
  },
  {
    desc: 'Kobo eReader',
    ua: 'Mozilla/5.0 (Unknown; Linux) AppleWebKit/538.1 (KHTML, like Gecko) Kobo eReader Safari/538.1',
    expected: { vendor: 'Kobo', model: 'eReader', type: 'tablet' },
  },
  {
    desc: 'Kobo Touch',
    ua: 'Mozilla/5.0 (Linux; U; Android 2.0; en-us;) AppleWebKit/538.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/538.1 (Kobo Touch 0377/4.20.14622)',
    expected: { vendor: 'Kobo', model: 'Touch', type: 'tablet' },
  },
  {
    desc: 'Lenovo A7',
    ua: 'Mozilla/5.0 (Linux; U; Android 9; en-US; Lenovo L19111 Build/PPR1.180610.011) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/57.0.2987.108 UCBrowser/13.2.8.1301 Mobile Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'L19111', type: 'mobile' },
  },
  {
    desc: 'Lenovo A8',
    ua: 'Mozilla/5.0 (Linux; Android 10; Lenovo L10041) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.73 Mobile Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'L10041', type: 'mobile' },
  },
  {
    desc: 'Lenovo dtab Compact 42A',
    ua: 'Mozilla/5.0 (Linux; Android 12; d-42A Build/SKQ1.220201.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/102.0.5005.125 Mobile Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'd-42A', type: 'tablet' },
  },
  {
    desc: 'Lenovo IdeaTab A7-50',
    ua: 'Mozilla/5.0 (Linux; Android 4.4.2; Lenovo A3500-HV Build/KOT49H) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/30.0.0.0 Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'A3500-HV', type: 'tablet' },
  },
  {
    desc: 'Lenovo IdeaTab A2109A',
    ua: 'Mozilla/5.0 (Linux; U; Android 4.2.2; ru-ru; A2109A Build/JDQ39; CyanogenMod-10.1) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
    expected: { vendor: 'Lenovo', model: 'A2109A', type: 'tablet' },
  },
  {
    desc: 'Lenovo IdeaTab S6000',
    ua: 'Mozilla/5.0 (Linux; Android 6.0; S6000 Build/MRA58K; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/55.0.2883.91 Mobile Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'S6000', type: 'tablet' },
  },
  {
    desc: 'Lenovo IdeaTab S6000',
    ua: 'Mozilla/5.0 (Linux; Android 4.2.2; IdeaTab S6000-H) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.102 YaBrowser/18.11.1.1011.01 Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'IdeaTab S6000-H', type: 'tablet' },
  },
  {
    desc: 'Lenovo K5 Pro',
    ua: 'Mozilla/5.0 (Linux; U; Android 9;zh-cn; Lenovo L38041 Build/PKQ1.190127.001) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/109.0.5414.117 MobileLenovoBrowser/9.1.3 Mobile Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'L38041', type: 'mobile' },
  },
  {
    desc: 'Lenovo K9',
    ua: 'Mozilla/5.0 (Linux; U; Android 8.1.0; en-US; Lenovo L38043 Build/O11019) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/40.0.2214.89 UCBrowser/11.4.8.1012 Mobile Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'L38043', type: 'mobile' },
  },
  {
    desc: 'Lenovo K10 Plus',
    ua: 'Mozilla/5.0 (Linux; Android 9; Lenovo L39051) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.66 Mobile Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'L39051', type: 'mobile' },
  },
  {
    desc: 'Lenovo K12',
    ua: 'Mozilla/5.0 (Linux; Android 10; Lenovo XT2081-4 Build/QCZ30.30-Q3-45-17; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/108.0.5359.128 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/409.0.0.27.106;]',
    expected: { vendor: 'Lenovo', model: 'XT2081-4', type: 'mobile' },
  },
  {
    desc: 'Lenovo K12',
    ua: 'Mozilla/5.0 (Linux; U; Android 10; Lenovo K12 Build/QOGS30.569-83-18; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/114.0.5735.130 Mobile Safari/537.36 OPR/69.0.2254.66073',
    expected: { vendor: 'Lenovo', model: 'K12', type: 'mobile' },
  },
  {
    desc: 'Lenovo Legion 2 Pro',
    ua: 'Mozilla/5.0 (Linux; Android 11; Lenovo L70081 Build/RKQ1.201112.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.58 Mobile Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'L70081', type: 'mobile' },
  },
  {
    desc: 'Lenovo Legion Y90',
    ua: 'Mozilla/5.0 (Linux; U; Android 12;en-us; Lenovo L71061/SKQ1.211113.001) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/80.0.3987.132 MobileLenovoBrowser/8.6.0 Mobile Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'L71061', type: 'mobile' },
  },
  {
    desc: 'Lenovo Legion Y700',
    ua: 'Mozilla/5.0 (Linux; U; Android 13;zh-cn; Lenovo TB-9707F Build/TKQ1.221013.002) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/109.0.5414.117 MobileLenovoBrowser/2.1.7 Mobile Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'TB-9707F', type: 'tablet' },
  },
  {
    desc: 'Lenovo Legion Y700',
    ua: 'Mozilla/5.0 (Linux; Android 12; TB320FC) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'TB320FC', type: 'tablet' },
  },
  {
    desc: 'Lenovo Moto Tab',
    ua: 'Mozilla/5.0 (Linux; Android 7.1.1; TB-X704A Build/NMF26F; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/113.0.5672.162 Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'TB-X704A', type: 'tablet' },
  },
  {
    desc: 'Lenovo Phone',
    ua: 'Mozilla/5.0 (Linux; Android 6.0; Lenovo PB2-650M Build/MRA58K; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/89.0.4389.105 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/311.0.0.44.117;]',
    expected: { vendor: 'Lenovo', model: 'PB2-650M', type: 'mobile' },
  },
  {
    desc: 'Lenovo S5 Pro',
    ua: 'Mozilla/5.0 (Linux; Android 9; Lenovo L58041) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Mobile Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'L58041', type: 'mobile' },
  },
  {
    desc: 'Lenovo Smart Tab M8',
    ua: 'Mozilla/5.0 (Linux; arm_64; Android 10; Lenovo TB-8505XS) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.85 YaBrowser/21.11.7.71.00 SA/3 Mobile Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'TB-8505XS', type: 'tablet' },
  },
  {
    desc: 'Lenovo Smart Tab M8',
    ua: 'Mozilla/5.0 (Linux; arm_64; Android 10; Lenovo TB-8505FS) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.166 YaBrowser/21.8.4.111.00 (beta) SA/3 Mobile Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'TB-8505FS', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab 2',
    ua: 'Mozilla/5.0 (Linux; Android 5.0.1; Lenovo TAB 2 A7-30HC Build/LRX21M; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/74.0.3729.157 Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'TAB 2 A7-30HC', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab 2 A7',
    ua: 'Mozilla/5.0 (Linux; Android 7.0.99; Lenovo TAB 2 A7-30DC Build/LRX21M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.141 Safari/537.36 OPR/45.1.2246.125351',
    expected: { vendor: 'Lenovo', model: 'TAB 2 A7-30DC', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab 2 A10',
    ua: 'Mozilla/5.0 (Linux; U; Android 5.0.1; Lenovo TAB 2 A10-70L Build/LRX21M; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/60.0.3112.116 Safari/537.36 OPR/29.0.2254.120398',
    expected: { vendor: 'Lenovo', model: 'TAB 2 A10-70L', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab 2 A10-30',
    ua: 'Mozilla/5.0 (Linux; Android 6.0.1; TB2-X30F Build/LenovoTB2-X30F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.85 Mobile Safari/537.36 EdgA/90.0.818.49',
    expected: { vendor: 'Lenovo', model: 'TB2-X30F', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab 3 7',
    ua: 'Mozilla/5.0 (Linux; Android 6.0; Lenovo TB3-730X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.87 Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'TB3-730X', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab 3 7 Essential',
    ua: 'Mozilla/5.0 (Linux; Android 5.1; Lenovo TB3-710I Build/LMY47I; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/85.0.4183.127 Safari/537.36 GSA/5.4.28.19.arm',
    expected: { vendor: 'Lenovo', model: 'TB3-710I', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab 3 7 Plus',
    ua: 'Mozilla/5.0 (Linux; U; Android 6.0.1; en-US; Lenovo TB-7703X Build/S100) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/57.0.2987.108 UCBrowser/12.2.5.1102 Mobile Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'TB-7703X', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab 3 8 Dual',
    ua: 'Mozilla/5.0 (Linux; Android 6.0; 602LV Build/MRA58K; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/93.0.4577.82 Safari/537.36 GSA/12.36.22.23.arm64',
    expected: { vendor: 'Lenovo', model: '602LV', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab 3 8 Plus',
    ua: 'Mozilla/5.0 (Linux; U; Android 6.0.1; zh-cn; Lenovo TB-8703F Build/MMB29M) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/66.0.3359.126 MQQBrowser/9.8 Mobile Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'TB-8703F', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab 3 8 Plus',
    ua: 'Mozilla/5.0 (Linux; U; Android 6.0.1; Lenovo TB-8703X Build/MMB29M; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/65.0.3325.109 Safari/537.36 OPR/33.0.2254.125672',
    expected: { vendor: 'Lenovo', model: 'TB-8703X', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab 3 10 Business',
    ua: 'Mozilla/5.0 (Linux; U; Android 6.0; Lenovo TB3-X70F Build/MRA58K; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/63.0.3239.111 Safari/537.36 OPR/32.0.2254.123747',
    expected: { vendor: 'Lenovo', model: 'TB3-X70F', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab 3 10 Plus',
    ua: 'Mozilla/5.0 (Linux; U; Android 6.0; Lenovo TB3-X70L Build/MRA58K; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/86.0.4240.185 Safari/537.36 OPR/52.1.2254.54298',
    expected: { vendor: 'Lenovo', model: 'TB3-X70L', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab 3 Pro',
    ua: 'Mozilla/5.0 (Linux; Android 6.0.1; Lenovo YT3-X90F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.99 Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'YT3-X90F', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab 4',
    ua: 'Mozilla/5.0 (Linux; Android 7.1.1; Lenovo TB-X304F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.99 Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'TB-X304F', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab 4',
    ua: 'Mozilla/5.0 (Linux; Android 4.4.2; Lenovo TAB 2 A7-30HC) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'TAB 2 A7-30HC', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab 4 8',
    ua: 'Mozilla/5.0 (Linux; Android 8.1.0; Lenovo TB-8504F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Mobile Safari/537.36 OPR/64.2.3282.60128',
    expected: { vendor: 'Lenovo', model: 'TB-8504F', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab 4 8',
    ua: 'Mozilla/5.0 (Linux; U; Android 8.1.0; Lenovo TB-8504X Build/OPM1.171019.019; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/70.0.3538.110 Mobile Safari/537.36 OPR/52.2.2254.54723',
    expected: { vendor: 'Lenovo', model: 'TB-8504X', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab 4 8 Plus',
    ua: 'Mozilla/5.0 (Linux; arm_64; Android 8.1.0; Lenovo TB-8704F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.182 YaApp_Android/21.21.0/apad YaSearchBrowser/21.21.0/apad BroPP/1.0 SA/3 Mobile Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'TB-8704F', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab 4 8 Plus',
    ua: 'Mozilla/5.0 (Linux; Android 8.1.0; TB-8704V Build/OPM1.171019.019; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/104.0.5112.97 Safari/537.36 [FB_IAB/FB4A;FBAV/380.0.0.29.109;]',
    expected: { vendor: 'Lenovo', model: 'TB-8704V', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab 4 8 Plus',
    ua: 'Mozilla/5.0 (Linux; arm_64; Android 8.1.0; Lenovo TB-8704X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.120 YaBrowser/19.10.4.187.01 Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'TB-8704X', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab 4 8 REL',
    ua: 'Mozilla/5.0 (Linux; Android 7.1.1; Lenovo TB-8X04F Build/NMF26F; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/52.0.2743.100 Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'TB-8X04F', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab 4 10',
    ua: 'Mozilla/5.0 (Linux; U; Android 8.1.0; Lenovo TB-X304L Build/OPM1.171019.026; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/80.0.3987.149 Safari/537.36 OPR/47.0.2254.146760',
    expected: { vendor: 'Lenovo', model: 'TB-X304L', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab 4 10 Plus',
    ua: 'Mozilla/5.0 (Linux; arm_64; Android 7.1.1; Lenovo TB-X704L) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.141 YaBrowser/20.12.4.100.01 Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'TB-X704L', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab 4 10 Plus',
    ua: 'Mozilla/5.0 (Linux; arm_64; Android 7.1.1; Lenovo TB-X704F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.135 YaBrowser/20.8.5.97.01 Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'TB-X704F', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab 6',
    ua: 'Mozilla/5.0 (Linux; Android 11; A101LV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.61 Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'A101LV', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab 7',
    ua: 'Mozilla/5.0 (Linux; Android 7.0; Lenovo TB-7504X Build/NRD90M; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/119.0.6045.193 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/436.0.0.35.101;]',
    expected: { vendor: 'Lenovo', model: 'TB-7504X', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab 7 Essential',
    ua: 'Mozilla/5.0 (Linux; U; Android 7.0; Lenovo TB-7304I Build/NRD90M; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/58.0.3029.83 Safari/537.36 OPR/54.0.2254.56148',
    expected: { vendor: 'Lenovo', model: 'TB-7304I', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab 7 Essential',
    ua: 'Mozilla/5.0 (Linux; Android 7.0; Lenovo TB-7304X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'TB-7304X', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab 10 10.1',
    ua: 'Mozilla/5.0 (Linux; Android 6.0.1; Lenovo TB-X103F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'TB-X103F', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab E7',
    ua: 'Mozilla/5.0 (Linux; arm; Android 8.1.0; Lenovo TB-7104I) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.128 BroPP/1.0 SA/3 Mobile Safari/537.36 YandexSearch/7.52/apad YandexSearchBrowser/7.52',
    expected: { vendor: 'Lenovo', model: 'TB-7104I', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab E8',
    ua: 'Mozilla/5.0 (Linux; arm_64; Android 7.0; Lenovo TB-8304F1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.143 YaBrowser/19.7.4.97.01 Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'TB-8304F1', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab K10',
    ua: 'Mozilla/5.0 (Linux; Android 12; Lenovo TB-X6C6X Build/SP1A.210812.016; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.107 Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'TB-X6C6X', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab K10',
    ua: 'Mozilla/5.0 (Linux; Android 12; Lenovo TB-X6C6F Build/SP1A.210812.016; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.83 Safari/537.36 [FB_IAB/FB4A;FBAV/488.0.0.78.79;IABMV/1;] FBNV/5',
    expected: { vendor: 'Lenovo', model: 'TB-X6C6F', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab K11',
    ua: 'Mozilla/5.0 (Linux; arm_64; Android 10; Lenovo TB-J606N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 YaApp_Android/22.31.1/apad YaSearchBrowser/22.31.1/apad BroPP/1.0 SA/3 Mobile Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'TB-J606N', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab K11 Pro 5G',
    ua: 'Mozilla/5.0 (Linux; Android 12; Lenovo TB-J607Z Build/SKQ1.211103.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.58 Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'TB-J607Z', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab M7',
    ua: 'Mozilla/5.0 (Linux; Android 9; Lenovo TB-7305X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.105 Mobile Safari/537.36 OPR/63.3.3216.58675',
    expected: { vendor: 'Lenovo', model: 'TB-7305X', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab M7',
    ua: 'Mozilla/5.0 (Linux; arm; Android 9; Lenovo TB-7305I) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.135 YaApp_Android/20.85.0/apad YaSearchBrowser/20.85.0/apad BroPP/1.0 SA/1 Mobile Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'TB-7305I', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab M7 (Gen 3)',
    ua: 'Mozilla/5.0 (Linux; Android 11; Lenovo TB-7306F Build/RP1A.200720.011; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.86 Safari/537.36 [FB_IAB/FB4A;FBAV/489.0.0.66.81;IABMV/1;]',
    expected: { vendor: 'Lenovo', model: 'TB-7306F', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab M7 (Gen 3)',
    ua: 'Mozilla/5.0 (Linux; arm; Android 11; Lenovo TB-7306X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.141 YaBrowser/20.12.5.127.01 Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'TB-7306X', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab M8',
    ua: 'Mozilla/5.0 (Linux; Android 10; Lenovo TB-8505X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.101 Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'TB-8505X', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab M8',
    ua: 'Mozilla/5.0 (Linux; Android 9; Lenovo TB-8505F Build/PPR1.180610.011; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/87.0.4280.101 Mobile Safari/537.36 GSA/10.82.8.21.arm64',
    expected: { vendor: 'Lenovo', model: 'TB-8505F', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab M8 (Gen 3)',
    ua: 'Mozilla/5.0 (Linux; U; Android 11; zh-TW; Lenovo TB-8506X Build/RP1A.200720.011) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/78.0.3904.108 UCBrowser/13.4.0.1306 Mobile Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'TB-8506X', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab M8 (Gen 4)',
    ua: 'Mozilla/5.0 (Linux; Android 13; TB300FU Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.86 Mobile Safari/537.36[FBAN/EMA;FBLC/en_US;FBAV/417.0.0.9.97;]',
    expected: { vendor: 'Lenovo', model: 'TB300FU', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab M8 (Gen 4) (2024)',
    ua: 'Mozilla/5.0 (Linux; Android 13; TB301FU Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.6478.170 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/472.0.0.45.79;]',
    expected: { vendor: 'Lenovo', model: 'TB301FU', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab M8 FHD',
    ua: 'Mozilla/5.0 (Linux; Android 9; Lenovo TB-8705X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.99 Mobile Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'TB-8705X', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab M10',
    ua: 'Mozilla/5.0 (Linux; Android 12; TB310FU) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'TB310FU', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab M10',
    ua: 'Mozilla/5.0 (Linux; 13; TB310XU) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'TB310XU', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab M10',
    ua: 'Mozilla/5.0 (Linux; arm_64; Android 9; Lenovo TB-X606F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.127 YaBrowser/20.9.4.99.01 Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'TB-X606F', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab M10',
    ua: 'Mozilla/5.0 (Android 14; Mobile; Lenovo TB-X505F; rv:131.0) Gecko/131.0 Firefox/131.0',
    expected: { vendor: 'Lenovo', model: 'TB-X505F', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab M10',
    ua: 'Mozilla/5.0 (Linux; Android 14; Lenovo TB-X505L) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.6554.180 Mobile Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'TB-X505L', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab M10',
    ua: 'Mozilla/5.0 (Linux; Android 9; Lenovo TB-X605F Build/PKQ1.190319.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/87.0.4280.101 Safari/537.36 [FB_IAB/FB4A;FBAV/298.0.0.46.116;]',
    expected: { vendor: 'Lenovo', model: 'TB-X605F', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab M10',
    ua: 'Mozilla/5.0 (Linux; U; Android 10; Lenovo TB-X505X Build/QKQ1.191224.003; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/81.0.4044.138 Safari/537.36 OPR/52.2.2254.54723',
    expected: { vendor: 'Lenovo', model: 'TB-X505X', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab M10 (Gen 3) ',
    ua: 'Mozilla/5.0 (Linux; Android 12; TB328XU Build/SP1A.210812.016; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.58 Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'TB328XU', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab M10 (Gen 3) ',
    ua: 'Mozilla/5.0 (Linux; Android 12; TB328FU Build/SP1A.210812.016; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/114.0.5735.57 Safari/537.36 [FB_IAB/FB4A;FBAV/418.0.0.33.69;]',
    expected: { vendor: 'Lenovo', model: 'TB328FU', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab M10 FHD',
    ua: 'Mozilla/5.0 (Linux; Android 13; Lenovo TB-X605FC) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.6481.193 Mobile Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'TB-X605FC', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab M10 FHD',
    ua: 'Mozilla/5.0 (Linux; Android 9; Lenovo TB-X605LC) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.93 Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'TB-X605LC', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab M10 FHD',
    ua: 'Mozilla/5.0 (Linux; arm_64; Android 9; Lenovo TB-X605L) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.141 YaBrowser/20.12.0.141.01 Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'TB-X605L', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab M10 FHD Plus',
    ua: 'Mozilla/5.0 (Linux; Android 14; Lenovo TB-X606F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6496.93 Mobile Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'TB-X606F', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab M10 FHD Plus',
    ua: 'Mozilla/5.0 (Linux; Android 9; Lenovo TB-X606FA) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.5813.205 Mobile Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'TB-X606FA', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab M10 FHD Plus',
    ua: 'Mozilla/5.0 (Linux; Android 10; Lenovo TB-X606X Build/QP1A.190711.020; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/87.0.4280.101 Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'TB-X606X', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab M10 HD',
    ua: 'Mozilla/5.0 (Linux; U; Android 10; it-it; Lenovo TB-X306F Build/QP1A.190711.020) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Mobile Safari/537.36 PHX/6.2',
    expected: { vendor: 'Lenovo', model: 'TB-X306F', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab M10 HD',
    ua: 'Mozilla/5.0 (Linux; U; Android 10; it-it; Lenovo TB-X306F Build/QP1A.190711.020) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Mobile Safari/537.36 PHX/6.2',
    expected: { vendor: 'Lenovo', model: 'TB-X306F', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab M10 Plus (Gen 3)',
    ua: 'Mozilla/5.0 (Linux; U; Android 10; Lenovo TB-X306X Build/QP1A.190711.020; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/90.0.4430.210 Safari/537.36 OPR/55.1.2254.56965',
    expected: { vendor: 'Lenovo', model: 'TB-X306X', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab M11',
    ua: 'Mozilla/5.0 (Linux; Android 14; TB330FU Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.60 Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'TB330FU', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab P10',
    ua: 'Mozilla/5.0 (Linux; arm_64; Android 9; Lenovo TB-X705L) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.128 YaBrowser/21.3.3.160.01 Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'TB-X705L', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab P11',
    ua: 'Mozilla/5.0 (Linux; arm_64; Android 11; Lenovo TB-J606L) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.2311.135 YaBrowser/21.11.5.121.01 Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'TB-J606L', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab P11',
    ua: 'Mozilla/5.0 (Linux; U; Android 11; zh-cn; Lenovo TB-J606F Build/RKQ1.210303.002) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/89.0.4389.72 MQQBrowser/12.1 Mobile Safari/537.36 COVC/045830',
    expected: { vendor: 'Lenovo', model: 'TB-J606F', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab P11 Plus',
    ua: 'Mozilla/5.0 (Linux; Android 12; Lenovo TB-J616X Build/SP1A.210812.016; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/113.0.5672.162 Safari/537.36 [FB_IAB/FB4A;FBAV/418.0.0.33.69;]',
    expected: { vendor: 'Lenovo', model: 'TB-J616X', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab P11 (Gen 2)',
    ua: 'Mozilla/5.0 (Linux; Android 14; TB350FU Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.6778.46 Safari/537.36 [FB_IAB/FB4A;FBAV/490.0.0.63.82;IABMV/1;]',
    expected: { vendor: 'Lenovo', model: 'TB350FU', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab P11 Plus',
    ua: 'Mozilla/5.0 (Linux; Android 12; Lenovo TB-J616F Build/SP1A.210812.016; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.6668.9 Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'TB-J616F', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab P11 Pro',
    ua: 'Mozilla/5.0 (Linux; U; Android 11; zh-CN; Lenovo TB-J706F Build/RKQ1.201112.002) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/78.0.3904.108 Quark/5.8.6.223 Mobile Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'TB-J706F', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab P11 Pro',
    ua: 'Mozilla/5.0 (Linux; Android 11; Lenovo TB-J706L) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.5060.134 Safari/537.36 EdgA/103.0.1264.71',
    expected: { vendor: 'Lenovo', model: 'TB-J706L', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab P11 Pro (Gen 2)',
    ua: 'Mozilla/5.0 (Linux; Android 13; TB132FU Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.107 Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'TB132FU', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab P12',
    ua: 'Mozilla/5.0 (Linux; Android 14; TB370FU Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.106 Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'TB370FU', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab P12 Pro',
    ua: 'Mozilla/5.0 (Linux; Android 13; Lenovo TB-Q706F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'TB-Q706F', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab P12 Pro',
    ua: 'Mozilla/5.0 (Linux; Android 13; Lenovo TB-Q706Z Build/TKQ1.221013.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/127.0.6533.103 Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'TB-Q706Z', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab QT K11 WiFi',
    ua: 'Mozilla/5.0 (Linux; arm; Android 12; Lenovo TB-J6C6F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.114 YaBrowser/22.9.3.82.01 Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'TB-J6C6F', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab QT K11 Pro WiFi',
    ua: 'Mozilla/5.0 (Linux; Android 11; Lenovo TB-J607F Build/RKQ1.201217.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.86 Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'TB-J607F', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab V7',
    ua: 'Mozilla/5.0 (Linux; U; Android 9; en-US; Lenovo PB-6505M Build/PKQ1) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/57.0.2987.108 UCBrowser/12.9.9.1155 Mobile Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'PB-6505M', type: 'tablet' },
  },
  {
    desc: 'Lenovo Tab V7',
    ua: 'Mozilla/5.0 (Linux; arm_64; Android 9; Lenovo PB-6505Y) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.127 YaBrowser/20.9.3.85.00 Mobile Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'PB-6505Y', type: 'tablet' },
  },
  {
    desc: 'Lenovo X3 Lite',
    ua: 'Mozilla/5.0 (Linux; Android 6.0.1; Lenovo X3 Lite) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.88 Mobile Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'X3 Lite', type: 'mobile' },
  },
  {
    desc: 'Lenovo Yoga Smart Tab',
    ua: 'Mozilla/5.0 (Android 11; Mobile; Lenovo YT-X705X; rv:129.0) Gecko/129.0 Firefox/129.0',
    expected: { vendor: 'Lenovo', model: 'YT-X705X', type: 'tablet' },
  },
  {
    desc: 'Lenovo Yoga Smart Tab',
    ua: 'Mozilla/5.0 (Linux; arm_64; Android 10; Lenovo YT-X705F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.136 YaBrowser/20.2.4.153.01 Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'YT-X705F', type: 'tablet' },
  },
  {
    desc: 'Lenovo Yoga Smart Tab',
    ua: 'Mozilla/5.0 (Linux; Android 9; Lenovo YT-X705L Build/PKQ1.181218.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/87.0.4280.101 Safari/537.36 GSA/11.38.8.23.arm64',
    expected: { vendor: 'Lenovo', model: 'YT-X705L', type: 'tablet' },
  },
  {
    desc: 'Lenovo Yoga Tab 3',
    ua: 'Mozilla/5.0 (Linux; U; Android 6.0.1; Lenovo YT3-X50L Build/MMB29M; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/80.0.3987.149 Safari/537.36 OPR/46.0.2254.145391',
    expected: { vendor: 'Lenovo', model: 'YT3-X50L', type: 'tablet' },
  },
  {
    desc: 'Lenovo Yoga Tab 3',
    ua: 'Mozilla/5.0 (Linux; U; Android 6.0.1; Lenovo YT3-X50L Build/MMB29M; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/80.0.3987.149 Safari/537.36 OPR/46.0.2254.145391',
    expected: { vendor: 'Lenovo', model: 'YT3-X50L', type: 'tablet' },
  },
  {
    desc: 'Lenovo Yoga Tab 3',
    ua: 'Mozilla/5.0 (Linux; Android 6.0.1; Lenovo YT3-X50M Build/MMB29M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.137 Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'YT3-X50M', type: 'tablet' },
  },
  {
    desc: 'Lenovo Yoga Tab 3 8',
    ua: 'Mozilla/5.0(Linux; U; Android 5.1.1; pt-BR; Lenovo YT3-850F Build/LMY47V) AppleWebKit/537.36(KHTML, like Gecko) Version/4.0 Chrome/38.0.2125.102 Mobile Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'YT3-850F', type: 'tablet' },
  },
  {
    desc: 'Lenovo Yoga Tab 3 8',
    ua: 'Mozilla/5.0(Linux; U; Android 5.1.1; lv-LV; Lenovo YT3-850L Build/LMY47V) AppleWebKit/537.36(KHTML, like Gecko) Version/4.0 Chrome/38.0.2125.102 Mobile Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'YT3-850L', type: 'tablet' },
  },
  {
    desc: 'Lenovo Yoga Tab 3 10',
    ua: 'Mozilla/5.0(Linux; U; Android 5.1.1; vi-VN; Lenovo YT3-850M Build/LMY47V) AppleWebKit/537.36(KHTML, like Gecko) Version/4.0 Chrome/38.0.2125.102 Mobile Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'YT3-850M', type: 'tablet' },
  },
  {
    desc: 'Lenovo Yoga Tab 3 Plus',
    ua: 'Mozilla/5.0 (Linux; Android 7.1.1; Lenovo YT-X703L) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36 OPR/64.2.3282.60128',
    expected: { vendor: 'Lenovo', model: 'YT-X703L', type: 'tablet' },
  },
  {
    desc: 'Lenovo Yoga Tab 3 Plus',
    ua: 'Mozilla/5.0 (Linux; Android 7.1.2; YT-X703F Build/NJH47F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.141 Safari/537.36 OPR/45.0.2246.125120',
    expected: { vendor: 'Lenovo', model: 'YT-X703F', type: 'tablet' },
  },
  {
    desc: 'Lenovo Yoga Tab 11',
    ua: 'Mozilla/5.0 (Linux; arm_64; Android 12; Lenovo YT-J706X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.42 YaBrowser/24.1.1.42.01 (beta) Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'YT-J706X', type: 'tablet' },
  },
  {
    desc: 'Lenovo Yoga Tablet 8',
    ua: 'Mozilla/5.0 (Linux; U; Android 4.4.2; ru-ru; Lenovo B6000; Android/4.4.2; Release/08.26.2015) AppleWebKit/534.30 (KHTML, like Gecko) Mobile Safari/534.30',
    expected: { vendor: 'Lenovo', model: 'B6000', type: 'tablet' },
  },
  {
    desc: 'Lenovo Yoga Tablet 8',
    ua: 'Mozilla/5.0 (Linux; Android 4.4.2; Lenovo B6000-H Build/KOT49H) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/30.0.0.0 Safari/537.36 GSA/7.24.32.16.arm',
    expected: { vendor: 'Lenovo', model: 'B6000-H', type: 'tablet' },
  },
  {
    desc: 'Lenovo Yoga Tablet 8',
    ua: 'Mozilla/5.0 (Linux; U; Android 4.2.2; es-us; Lenovo B6000-F/JDQ39) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.2.2 Mobile Safari/534.30',
    expected: { vendor: 'Lenovo', model: 'B6000-F', type: 'tablet' },
  },
  {
    desc: 'Lenovo Yoga Tablet 10',
    ua: 'Mozilla/5.0 (Linux; U; Android 4.2.2; ru-ru; Lenovo B8000-F Build/JDQ39) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
    expected: { vendor: 'Lenovo', model: 'B8000-F', type: 'tablet' },
  },
  {
    desc: 'Lenovo Yoga Tablet 10',
    ua: 'Mozilla/5.0 (Linux; U; Android 4.2.2; ru-ru; Lenovo B8000-H Build/JDQ39) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Safari/534.30 Mobile UCBrowser/3.4.3.532',
    expected: { vendor: 'Lenovo', model: 'B8000-H', type: 'tablet' },
  },
  {
    desc: 'Lenovo Yoga Tablet 10 HD',
    ua: 'Mozilla/5.0 (Linux; U; Android 4.4.2; en-US; Lenovo B8080-H Build/KVT49L) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/57.0.2987.108 UCBrowser/12.0.0.1088 Mobile Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'B8080-H', type: 'tablet' },
  },
  {
    desc: 'Lenovo Yoga Tablet 10 HD',
    ua: 'Mozilla/5.0 (Linux; U; Android 4.3; ru-ru; Lenovo B8080-F/JLS36C) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.3 Mobile Safari/534.30',
    expected: { vendor: 'Lenovo', model: 'B8080-F', type: 'tablet' },
  },
  {
    desc: 'Lenovo Z6',
    ua: 'Mozilla/5.0 (Linux; U; Android 9;zh-cn; Lenovo L78121 Build/PKQ1.190319.001) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/109.0.5414.117 MobileLenovoBrowser/9.1.3 Mobile Safari/537.36',
    expected: { vendor: 'Lenovo', model: 'L78121', type: 'mobile' },
  },
  {
    desc: 'LG V40 ThinQ',
    ua: 'Mozilla/5.0 (Linux; Android 9; LM-V405) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.136 Mobile Safari/537.36',
    expected: { vendor: 'LG', model: 'LM-V405', type: 'mobile' },
  },
  {
    desc: 'LG K30',
    ua: 'Mozilla/5.0 (Linux; Android 8.1.0; LM-X410.F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.116 Mobile Safari/537.36',
    expected: { vendor: 'LG', model: 'LM-X410.F', type: 'mobile' },
  },
  {
    desc: 'LG K30',
    ua: 'Mozilla/5.0 (Linux; Android 9; LM-X410.FGN) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.93 Mobile Safari/537.36',
    expected: { vendor: 'LG', model: 'LM-X410.FGN', type: 'mobile' },
  },
  {
    desc: 'LG K40',
    ua: 'Mozilla/5.0 (Linux; Android 10; LM-X420) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.5563.57 Mobile Safari/537.36',
    expected: { vendor: 'LG', model: 'LM-X420', type: 'mobile' },
  },
  {
    desc: 'LG Stylo 4',
    ua: 'Mozilla/5.0 (Linux; Android 10; LM-Q710(FGN)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.5563.57 Mobile Safari/537.36',
    expected: { model: 'LM-Q710(FGN)', type: 'mobile' },
  },
  {
    desc: 'LG Stylo 5',
    ua: 'Mozilla/5.0 (Linux; Android 9; LM-Q720) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.96 Mobile Safari/537.36',
    expected: { vendor: 'LG', model: 'LM-Q720', type: 'mobile' },
  },
  {
    desc: 'LG G7 ThinQ',
    ua: 'Mozilla/5.0 (Linux; Android 9; LM-G710VM Build/PKQ1.181105.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/79.0.3945.136 Mobile Safari/537.36',
    expected: { vendor: 'LG', model: 'LM-G710VM', type: 'mobile' },
  },
  {
    desc: 'LG K20',
    ua: 'Mozilla/5.0 (Android 13; Mobile; LG-M255; rv:111.0) Gecko/111.0 Firefox/111.0',
    expected: { vendor: 'LG', model: 'M255', type: 'mobile' },
  },
  {
    desc: 'LG K500',
    ua: 'Mozilla/5.0 (Linux; Android 6.0.1; LG-K500 Build/MMB29M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.111 Mobile Safari/537.36',
    expected: { vendor: 'LG', model: 'K500', type: 'mobile' },
  },
  {
    desc: 'LG Nexus 4',
    ua: 'Mozilla/5.0 (Linux; Android 4.2.1; Nexus 4 Build/JOP40D) AppleWebKit/535.19 (KHTML, like Gecko) Chrome/18.0.1025.166 Mobile Safari/535.19',
    expected: { vendor: 'LG', model: 'Nexus 4', type: 'mobile' },
  },
  {
    desc: 'LG Nexus 4',
    ua: 'Mozilla/5.0 (Linux; U; Android 4.3; en-us; Google Nexus 4 - 4.3 - API 18 - 768x1280 Build/JLS36G) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
    expected: { vendor: 'LG', model: 'Nexus 4', type: 'mobile' },
  },
  {
    desc: 'LG Nexus 5',
    ua: 'Mozilla/5.0 (Linux; Android 4.2.1; en-us; Nexus 5 Build/JOP40D) AppleWebKit/535.19 (KHTML, like Gecko) Chrome/18.0.1025.166 Mobile Safari/535.19',
    expected: { vendor: 'LG', model: 'Nexus 5', type: 'mobile' },
  },
  {
    desc: 'LG Wing',
    ua: 'Mozilla/5.0 (Linux; Android 10; LM-F100N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.101 Mobile Safari/537.36',
    expected: { vendor: 'LG', model: 'LM-F100N', type: 'mobile' },
  },
  {
    desc: 'LG Smart TV',
    ua: 'Mozilla/5.0 (DirectFB; U; Linux mips; en) AppleWebKit/528.5+ (KHTML, like Gecko, Safari/528.5+) LG Browser (; LG NetCast.TV-2011)',
    expected: { vendor: 'LG', type: 'smarttv' },
  },
  {
    desc: 'LG Smart TV',
    ua: 'Mozilla/5.0 (Linux; NetCast; U) AppleWebKit/537.31 (KHTML, like Gecko) Chrome/53.0.2785 34 Safari/537.31 SmartTV/8.5',
    expected: { vendor: 'LG', type: 'smarttv' },
  },
  {
    desc: 'LG Android TV',
    ua: 'Mozilla/5.0 (Linux; U; Android 4.2.2; zh-cn; LG Android TV Build/JDQ39) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Safari/534.30',
    expected: { vendor: 'LG', type: 'smarttv' },
  },
  {
    desc: 'LG Watch Urbane',
    ua: 'Mozilla/5.0 Linux; Android 7.1.1; LG Watch Urbane Build/NWD1.180306.004 AppleWebKit/537.36 KHTML, like Gecko Chrome/19.77.34.5 Mobile Safari/537.36',
    expected: { vendor: 'LG', model: 'Watch Urbane', type: 'wearable' },
  },
  {
    desc: 'LG G Watch R',
    ua: 'Mozilla/5.0 (Linux; Android 5.1.1; G Watch R Build/LCA44B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.157 Crosswalk/15.44.384.12 Mobile Safari/537.36',
    expected: { vendor: 'LG', model: 'G Watch R', type: 'wearable' },
  },
  {
    desc: 'Loewe Smart TV',
    ua: 'Mozilla/5.0 (Linux; U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Safari/537.36 OPR/46.0.2207.0 LOEWE-SL410/5.2.0.0 HbbTV/1.4.1 (; LOEWE; SL410; LOH/5.2.0.0;;) FVC/3.0 (LOEWE; SL410;) CE-HTML/1.0 Config (L:deu,CC:DEU) NETRANGEMMH',
    expected: { vendor: 'LOEWE', model: 'SL410', type: 'smarttv' },
  },
  {
    desc: 'Meizu M5 Note',
    ua: 'Mozilla/5.0 (Linux; Android 6.0; M5 Note Build/MRA58K; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/53.0.2785.49 Mobile MQQBrowser/6.2 TBS/043024 Safari/537.36 MicroMessenger/6.5.7.1040 NetType/WIFI Language/zh_CN',
    expected: { vendor: 'Meizu', model: 'M5 Note', type: 'mobile' },
  },
  {
    desc: 'Micromax Bharat 2 Plus',
    ua: 'Mozilla/5.0 (Linux; U; Android 7.0; en-US; Micromax Q402Plus Build/NRD90M) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/57.0.2987.108 UCBrowser/12.12.9.1226 Mobile Safari/537.36',
    expected: { vendor: 'Micromax', model: 'Q402Plus', type: 'mobile' },
  },
  {
    desc: 'Micromax Canvas Infinity',
    ua: 'Mozilla/5.0 (Linux; U; Android 7.1.2; en-US; Micromax HS2 Build/N2G47H) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 UCBrowser/13.2.0.1296 (SpeedMode) U4/1.0 UCWEB/2.0 Mobile Safari/534.30',
    expected: { vendor: 'Micromax', model: 'HS2', type: 'mobile' },
  },
  {
    desc: 'Micromax In 1b',
    ua: 'Mozilla/5.0 (Linux; U; Android 10; Micromax E7533 Build/QP1A.190711.020; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/87.0.4280.101 Mobile Safari/537.36 OPR/54.0.2254.56148',
    expected: { vendor: 'Micromax', model: 'E7533', type: 'mobile' },
  },
  {
    desc: 'Microsoft Lumia 950',
    ua: 'Mozilla/5.0 (Windows Phone 10.0; Android 4.2.1; Microsoft; Lumia 950) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2486.0 Mobile Safari/537.36 Edge/13.10586',
    expected: { vendor: 'Microsoft', model: 'Lumia 950', type: 'mobile' },
  },
  {
    desc: 'Microsoft Surface Duo',
    ua: 'Dalvik/2.1.0 (Linux; U; Android 10; Surface Duo Build/2020.1014.61)',
    expected: { vendor: 'Microsoft', model: 'Surface Duo', type: 'tablet' },
  },
  {
    desc: 'Motorola Moto X',
    ua: 'Mozilla/5.0 (Linux; Android 4.4.4; XT1097 Build/KXE21.187-38) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.109 Mobile Safari/537.36',
    expected: { vendor: 'Motorola', model: 'XT1097', type: 'mobile' },
  },
  {
    desc: 'Motorola Moto Z3 Play',
    ua: 'Mozilla/5.0 (Linux; Android 9; Moto Z3 Play) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Mobile Safari/537.36',
    expected: { vendor: 'Motorola', model: 'Moto Z3 Play', type: 'mobile' },
  },
  {
    desc: 'Motorola Moto 360',
    ua: 'Mozilla/5.0 (Linux; Android 4.4; Moto 360 Build/KNX01S) AppleWebKit/537.36 (KHTML, like Gecko) WIB/0.9.8 Mobile Safari/537.36',
    expected: { vendor: 'Motorola', model: 'Moto 360', type: 'wearable' },
  },
  {
    desc: 'Meizu M3S',
    ua: 'Mozilla/5.0 (X11; Linux; Android 5.1; MZ-M3s Build/LMY47I) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrom/45.0.2454.94 Mobile Safari/537.36',
    expected: { vendor: 'Meizu', model: 'M3s', type: 'mobile' },
  },
  {
    desc: 'Microsoft Lumia 950',
    ua: 'Mozilla/5.0 (Windows Phone 10.0; Android 4.2.1; Microsoft; Lumia 950) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2486.0 Mobile Safari/537.36 Edge/13.10586',
    expected: { vendor: 'Microsoft', model: 'Lumia 950', type: 'mobile' },
  },
  {
    desc: 'Motorola Nexus 6',
    ua: 'Mozilla/5.0 (Linux; Android 5.1.1; Nexus 6 Build/LYZ28E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.20 Mobile Safari/537.36',
    expected: { vendor: 'Motorola', model: 'Nexus 6', type: 'mobile' },
  },
  {
    desc: 'Motorola Droid RAZR 4G',
    ua: 'Mozilla/5.0 (Linux; U; Android 2.3; xx-xx; DROID RAZR 4G Build/6.5.1-73_DHD-11_M1-29) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1',
    expected: { vendor: 'Motorola', model: 'DROID RAZR 4G', type: 'mobile' },
  },
  {
    desc: 'Motorola RAZR 2019',
    ua: 'Mozilla/5.0 (Linux; Android 9; motorola razr) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/11.1 Chrome/75.0.3770.143 Mobile Safari/537.36',
    expected: { vendor: 'Motorola', model: 'razr', type: 'mobile' },
  },
  {
    desc: 'iPhone',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 7_0 like Mac OS X) AppleWebKit/537.51.1 (KHTML, like Gecko) Version/7.0 Mobile/11A465 Safari/9537.53',
    expected: { vendor: 'Apple', model: 'iPhone', type: 'mobile' },
  },
  {
    desc: 'iPhone SE',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBDV/iPhone8,4;FBMD/iPhone;FBSN/iOS;FBSV/13.3.1;FBSS/2;FBID/phone;FBLC/en_US;FBOP/5;FBCR/]',
    expected: { vendor: 'Apple', model: 'iPhone', type: 'mobile' },
  },
  {
    desc: 'iPhone SE using Facebook App',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBDV/iPhone8,4;FBMD/iPhone;FBSN/iOS;FBSV/13.3.1;FBSS/2;FBID/phone;FBLC/en_US;FBOP/5;FBCR/]',
    expected: { vendor: 'Apple', model: 'iPhone', type: 'mobile' },
  },
  {
    desc: 'iPhone 11 Pro Max',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBDV/iPhone12,5;FBMD/iPhone;FBSN/iOS;FBSV/13.3.1;FBSS/3;FBID/phone;FBLC/en_US;FBOP/5;FBCR/]',
    expected: { vendor: 'Apple', model: 'iPhone', type: 'mobile' },
  },
  {
    desc: 'iPhone XS',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBDV/iPhone11,2;FBMD/iPhone;FBSN/iOS;FBSV/13.3.1;FBSS/3;FBID/phone;FBLC/en_US;FBOP/5;FBCR/]',
    expected: { vendor: 'Apple', model: 'iPhone', type: 'mobile' },
  },
  {
    desc: 'iPod touch',
    ua: 'Mozilla/5.0 (iPod touch; CPU iPhone OS 7_0_2 like Mac OS X) AppleWebKit/537.51.1 (KHTML, like Gecko) Version/7.0 Mobile/11A501 Safari/9537.53',
    expected: { vendor: 'Apple', model: 'iPod touch', type: 'mobile' },
  },
  {
    desc: 'itel A25',
    ua: 'Mozilla/5.0 (Linux; Android 9; itel L5002) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.130 Mobile Safari/537.36 OPR/63.3.3216.58675',
    expected: { vendor: 'itel', model: 'L5002', type: 'mobile' },
  },
  {
    desc: 'itel A50',
    ua: 'Mozilla/5.0 (Linux; U; Android 14; itel A667L Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/127.0.6533.103 Mobile Safari/537.36 OPR/83.1.2254.73239',
    expected: { vendor: 'itel', model: 'A667L', type: 'mobile' },
  },
  {
    desc: 'itel KidPad 1',
    ua: 'Mozilla/5.0 (Linux; Android 10; Itel W7001) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.101 Mobile Safari/537.36',
    expected: { vendor: 'itel', model: 'W7001', type: 'tablet' },
  },
  {
    desc: 'itel Pad One',
    ua: 'Mozilla/5.0 (Linux; Android 12; itel P10001L Build/SP1A.210812.016) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.172 Safari/537.36',
    expected: { vendor: 'itel', model: 'P10001L', type: 'tablet' },
  },
  {
    desc: 'itel RS4',
    ua: 'Mozilla/5.0 (Linux; Android 13; itel S666LN Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/125.0.6422.165 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/468.1.0.56.78;]',
    expected: { vendor: 'itel', model: 'S666LN', type: 'mobile' },
  },
  {
    desc: 'itel Vision 2S',
    ua: 'Mozilla/5.0 (Linux; Android 11; itel P651L Build/RP1A.201005.001) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.5672.76 Mobile Safari/537.36',
    expected: { vendor: 'itel', model: 'P651L', type: 'mobile' },
  },
  {
    desc: 'Moto X',
    ua: 'Mozilla/5.0 (Linux; U; Android 4.2; xx-xx; XT1058 Build/13.9.0Q2.X-70-GHOST-ATT_LE-2) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
    expected: { vendor: 'Motorola', model: 'XT1058', type: 'mobile' },
  },
  {
    desc: 'Motorola Moto g(6) Play',
    ua: 'Mozilla/5.0 (Linux; Android 9; moto g(6) play) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.136 Mobile Safari/537.36',
    expected: { vendor: 'Motorola', model: 'moto g(6) play', type: 'mobile' },
  },
  {
    desc: 'Motorola Moto g(7) Supra',
    ua: 'Mozilla/5.0 (Linux; Android 9; moto g(7) supra Build/PCOS29.114-134-2; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/73.0.3683.90 Mobile Safari/537.36',
    expected: { vendor: 'Motorola', model: 'moto g(7) supra', type: 'mobile' },
  },
  {
    desc: 'Motorola Moto E',
    ua: 'Mozilla/5.0 (Linux; Android 7.1.1; Moto E (4) Build/NDQS26.69-64-11-7; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/56.0.2924.87 Mobile Safari/537.36',
    expected: { vendor: 'Motorola', model: 'Moto E (4)', type: 'mobile' },
  },
  {
    desc: 'Nokia3xx',
    ua: 'Nokia303/14.87 CLDC-1.1',
    expected: { vendor: 'Nokia', model: '303', type: 'mobile' },
  },
  {
    desc: 'Nokia 3.2',
    ua: 'Mozilla/5.0 (Linux; Android 10; Nokia 3.2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.141 Mobile Safari/537.36',
    expected: { vendor: 'Nokia', model: '3.2', type: 'mobile' },
  },
  {
    desc: 'Nokia 5800 XpressMusic',
    ua: 'Mozilla/5.0 (SymbianOS/9.4; U; Series60/5.0 Nokia5800d-1/10.4.016; Profile/MIDP-2.1 Configuration/CLDC-1.1 ) AppleWebKit/413 (KHTML, like Gecko) Safari/413',
    expected: { vendor: 'Nokia', model: '5800d-1', type: 'mobile' },
  },
  {
    desc: 'Nokia 7',
    ua: 'Mozilla/5.0 (Linux; Android 11; Nokia 7.2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Mobile Safari/537.36',
    expected: { vendor: 'Nokia', model: '7.2', type: 'mobile' },
  },
  {
    desc: 'Nokia 808 PureView',
    ua: 'Mozilla/5.0 (Symbian; U; Nokia808 PureView; en-GB) AppleWebKit/534.3 (KHTML, like Gecko) Version/3.0 Mobile/1A543a Mobile Safari/534.3',
    expected: { vendor: 'Nokia', model: '808 PureView', type: 'mobile' },
  },
  {
    desc: 'Nokia 808 PureView',
    ua: 'Mozilla/5.0 (Symbian/3; Series60/5.5 Nokia808PureView/113.010.1508; Profile/MIDP-2.1 Configuration/CLDC-1.1 ) AppleWebKit/535.1 (KHTML, like Gecko) NokiaBrowser/8.3.2.21 Mobile Safari/535.1 3gpp-gba',
    expected: { vendor: 'Nokia', model: '808PureView', type: 'mobile' },
  },
  {
    desc: 'Nokia Lumia 630',
    ua: 'UCWEB/2.0 (Windows; U; wds 8.10; en-IN; NOKIA; RM-978_1046) U2/1.0.0 UCBrowser/4.2.0.524 U2/1.0.0 Mobile',
    expected: { vendor: 'Nokia', model: 'RM-978', type: 'mobile' },
  },
  {
    desc: 'Nokia N9',
    ua: 'Mozilla/5.0 (MeeGo; NokiaN9) AppleWebKit/534.13 (KHTML, like Gecko) NokiaBrowser/8.5.0 Mobile Safari/534.13',
    expected: { vendor: 'Nokia', model: 'N9', type: 'mobile' },
  },
  {
    desc: 'Nokia N900',
    ua: 'Mozilla/5.0 (Linux; Maemo 5.0; Nokia N900; Build/4.0.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Mobile Safari/537.36',
    expected: { vendor: 'Nokia', model: 'N900', type: 'mobile' },
  },
  {
    desc: 'Nokia T20',
    ua: 'Mozilla/5.0 (Linux; Android 12; Nokia T20) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
    expected: { vendor: 'Nokia', model: 'T20', type: 'tablet' },
  },
  {
    desc: 'Nokia T20',
    ua: 'Mozilla/5.0 (Linux; Android 11; Nokia T20 Build/RP1A.201005.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/93.0.4577.62 Safari/537.36',
    expected: { vendor: 'Nokia', model: 'T20', type: 'tablet' },
  },
  {
    desc: 'Nokia T21',
    ua: 'Dalvik/2.1.0 (Linux; U; Android 13; Nokia T21 Build/TP1A.220624.014)',
    expected: { vendor: 'Nokia', model: 'T21', type: 'tablet' },
  },
  {
    desc: 'Nokia 2720 Flip',
    ua: 'Mozilla/5.0 (Mobile; Nokia_2720_Flip; rv:48.0) Gecko/48.0 Firefox/48.0 KAIOS/2.5.2',
    expected: { vendor: 'Nokia', model: '2720 Flip', type: 'mobile' },
  },
  {
    desc: 'Nothing 1',
    ua: 'Mozilla/5.0 (Linux; Android 13; A063) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/22.0 Chrome/111.0.5563.116 Mobile Safari/537.36',
    expected: { vendor: 'Nothing', model: 'A063', type: 'mobile' },
  },
  {
    desc: 'Nothing 2',
    ua: 'Mozilla/5.0 (Linux; Android 14; A065 Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/125.0.6422.53 Mobile Safari/537.36',
    expected: { vendor: 'Nothing', model: 'A065', type: 'mobile' },
  },
  {
    desc: 'Nothing 2a',
    ua: 'Mozilla/5.0 (Linux; Android 14; A142 Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.6478.71 Mobile Safari/537.36',
    expected: { vendor: 'Nothing', model: 'A142', type: 'mobile' },
  },
  {
    desc: 'Oculus Quest',
    ua: 'Mozilla/5.0 (Linux; Android 10; Quest) AppleWebKit/537.36 (KHTML, like Gecko) OculusBrowser/15.0.0.0.22.280317669 SamsungBrowser/4.0 Chrome/89.0.4389.90 VR Safari/537.36',
    expected: { vendor: 'Facebook', model: 'Quest', type: 'wearable' },
  },
  {
    desc: 'Oculus Quest 2',
    ua: 'Mozilla/5.0 (Linux; Android 10; Quest 2) AppleWebKit/537.36 (KHTML, like Gecko) OculusBrowser/15.0.0.0.22.280317669 SamsungBrowser/4.0 Chrome/89.0.4389.90 VR Safari/537.36',
    expected: { vendor: 'Facebook', model: 'Quest 2', type: 'wearable' },
  },
  {
    desc: 'Oculus Quest 3',
    ua: 'Mozilla/5.0 (X11; Linux x86_64; Quest 3) AppleWebKit/537.36 (KHTML, like Gecko) OculusBrowser/31.4.0.6.51.566757996 Chrome/120.0.6099.283 VR Safari/537.36',
    expected: { vendor: 'Facebook', model: 'Quest 3', type: 'wearable' },
  },
  {
    desc: 'Oculus Quest Pro',
    ua: 'Mozilla/5.0 (X11; Linux x86_64; Quest Pro) AppleWebKit/537.36 (KHTML, like Gecko) OculusBrowser/24.4.0.22.60.426469926 SamsungBrowser/4.0 Chrome/106.0.5249.181 VR Safari/537.36',
    expected: { vendor: 'Facebook', model: 'Quest Pro', type: 'wearable' },
  },
  { desc: 'Issue #747', ua: 'python-requests/2.25.1', expected: {} },
  {
    desc: 'OnePlus One',
    ua: 'Mozilla/5.0 (Linux; Android 4.4.4; A0001 Build/KTU84Q) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.59 Mobile Safari/537.36',
    expected: { vendor: 'OnePlus', model: 'A0001', type: 'mobile' },
  },
  {
    desc: 'OnePlus One',
    ua: 'Mozilla/5.0 (Linux; Android 4.4.2; OnePlus One A0001 Build/KVT49L) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.117 Mobile Safari/537.36',
    expected: { vendor: 'OnePlus', model: 'A0001', type: 'mobile' },
  },
  {
    desc: 'OnePlus 2',
    ua: 'Mozilla/5.0 (Linux; Android 6.0.1; ONE A2003) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.93 Mobile Safari/537.36',
    expected: { vendor: 'OnePlus', model: 'A2003', type: 'mobile' },
  },
  {
    desc: 'OnePlus 3',
    ua: 'Mozilla/5.0 (Linux; Android 7.1.1; ONEPLUS A3000 Build/NMF26F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.98 Mobile Safari/537.36',
    expected: { vendor: 'OnePlus', model: 'A3000', type: 'mobile' },
  },
  {
    desc: 'OnePlus 6',
    ua: 'Mozilla/5.0 (Linux; Android 9; ONEPLUS A6003) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.89 Mobile Safari/537.36',
    expected: { vendor: 'OnePlus', model: 'A6003', type: 'mobile' },
  },
  {
    desc: 'OnePlus 6T',
    ua: 'Mozilla/5.0 (Linux; Android 9; ONEPLUS A6010) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.96 Mobile Safari/537.36',
    expected: { vendor: 'OnePlus', model: 'A6010', type: 'mobile' },
  },
  {
    desc: 'OnePlus 7T Pro',
    ua: 'Mozilla/5.0 (Linux; Android 10; HD1913) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.5563.57 Mobile Safari/537.36 EdgA/110.0.1587.66',
    expected: { model: 'HD1913', type: 'mobile' },
  },
  {
    desc: 'OnePlus 8T',
    ua: 'Mozilla/5.0 (Linux; Android 11; KB2005) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.127 Mobile Safari/537.36',
    expected: { vendor: 'OnePlus', model: 'KB2005', type: 'mobile' },
  },
  {
    desc: 'OnePlus 8 Pro',
    ua: 'Mozilla/5.0 (Linux; Android 10; IN2025) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.119 Mobile Safari/537.36',
    expected: { vendor: 'OnePlus', model: 'IN2025', type: 'mobile' },
  },
  {
    desc: 'OnePlus 10RT',
    ua: 'Mozilla/5.0 (Linux; Android 13; CPH2413) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Mobile Safari/537.36',
    expected: { vendor: 'OPPO', model: 'CPH2413', type: 'mobile' },
  },
  {
    desc: 'OnePlus Nord N100',
    ua: 'Mozilla/5.0 (Linux; Android 10; BE2015 Build/QKQ1.200719.002; xx-xx) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/83.0.4103.106 Mobile Safari/537.36',
    expected: { vendor: 'OnePlus', model: 'BE2015', type: 'mobile' },
  },
  {
    desc: 'OnePlus Nord N10 5G',
    ua: 'Mozilla/5.0 (Linux; Android 10; BE2029) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.185 Mobile Safari/537.36',
    expected: { vendor: 'OnePlus', model: 'BE2029', type: 'mobile' },
  },
  {
    desc: 'OnePlus Pad Go 11.35',
    ua: 'Mozilla/5.0 (Linux; arm_64; Android 14; OPD2304) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.629 YaApp_Android/24.101/apad YaSearchBrowser/24.101/apad BroPP/1.0 SA/3 Mobile Safari/537.36',
    expected: { vendor: 'OnePlus', model: 'OPD2304', type: 'tablet' },
  },
  {
    desc: 'OnePlus Pad 2 12.1 WiFi',
    ua: 'Mozilla/5.0 (Linux; Android 14; OPD2403 Build/UKQ1.231108.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.107 Safari/537.36',
    expected: { vendor: 'OnePlus', model: 'OPD2403', type: 'tablet' },
  },
  {
    desc: 'OnePlus Pad 11.61 WiFi',
    ua: 'Mozilla/5.0 (Linux; Android 14; OPD2203 Build/UKQ1.230924.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.107 Safari/537.36',
    expected: { vendor: 'OnePlus', model: 'OPD2203', type: 'tablet' },
  },
  {
    desc: 'OnePlus Watch 2',
    ua: 'Dalvik/2.1.0 (Linux; U; Android 13; OPWWE231 Build/TWR7.231113.001.OPWWE231_11_A.117.240703)',
    expected: { vendor: 'OnePlus', model: 'OPWWE231', type: 'wearable' },
  },
  {
    desc: 'OPPO Pad',
    ua: 'Mozilla/5.0 (Linux; U; Android 13; zh-CN; OPD2101 Build/TP1A.220905.001) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/100.0.4896.58 UCBrowser/16.3.9.1290 Mobile Safari/537.36',
    expected: { vendor: 'OPPO', model: 'OPD2101', type: 'tablet' },
  },
  {
    desc: 'OPPO Neo',
    ua: 'Mozilla/5.0 (Linux; U; Android 4.2.2; zh-cn; R831T Build/JDQ39) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 OppoBrowser/3.3.2 Mobile Safari/534.30',
    expected: { vendor: 'OPPO', model: 'R831T', type: 'mobile' },
  },
  {
    desc: 'OPPO R7s',
    ua: 'Mozilla/5.0 (Linux; U; Android 4.4.4; zh-cn; OPPO R7s Build/KTU84P) AppleWebKit/537.36 (KHTML, like Gecko)Version/4.0 Chrome/37.0.0.0 MQQBrowser/7.1 Mobile Safari/537.36',
    expected: { vendor: 'OPPO', model: 'R7s', type: 'mobile' },
  },
  {
    desc: 'OPPO A3s',
    ua: 'Mozilla/5.0 (Linux; Android 8.1; CPH1803 Build/OPM1.171019.026; xx-xx) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/66.0.3359.126 Mobile Safari/537.36',
    expected: { vendor: 'OPPO', model: 'CPH1803', type: 'mobile' },
  },
  {
    desc: 'OPPO A12',
    ua: 'Mozilla/5.0 (Linux; Android 9; CPH2083) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.116 Mobile Safari/537.36',
    expected: { vendor: 'OPPO', model: 'CPH2083', type: 'mobile' },
  },
  {
    desc: 'OPPO Reno',
    ua: 'Mozilla/5.0 (Linux; Android 9; PCAT00 Build/PKQ1.190101.001; xx-xx) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/70.0.3538.110 Mobile Safari/537.36',
    expected: { vendor: 'OPPO', model: 'PCAT00', type: 'mobile' },
  },
  {
    desc: 'OPPO Reno3 Pro 5G',
    ua: 'Mozilla/5.0 (Linux; Android 10; PCLM50) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.117 Mobile Safari/537.36',
    expected: { vendor: 'OPPO', model: 'PCLM50', type: 'mobile' },
  },
  {
    desc: 'OPPO Reno4 SE',
    ua: 'Mozilla/5.0 (Linux; U; Android 10; xx-xx; PEAM00 Build/QP1A.190711.020) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/70.0.3538.80 Mobile Safari/537.36',
    expected: { vendor: 'OPPO', model: 'PEAM00', type: 'mobile' },
  },
  {
    desc: 'OPPO Reno4 5G',
    ua: 'Mozilla/5.0 (Linux; Android 10; PDPM00 Build/QKQ1.200216.002; xx-xx) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/76.0.3809.89 Mobile Safari/537.36',
    expected: { vendor: 'OPPO', model: 'PDPM00', type: 'mobile' },
  },
  {
    desc: 'OPPO Reno4 Pro 5G',
    ua: 'Mozilla/5.0 (Linux; U; Android 10; xx-xx; PDNT00 Build/QKQ1.200216.002) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/70.0.3538.80 Mobile Safari/537.36',
    expected: { vendor: 'OPPO', model: 'PDNT00', type: 'mobile' },
  },
  {
    desc: 'OPPO Reno5 A',
    ua: 'Mozilla/5.0 (Linux; Android 11; A101OP) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Mobile Safari/537.36',
    expected: { vendor: 'OPPO', model: 'A101OP', type: 'mobile' },
  },
  {
    desc: 'OPPO Find X',
    ua: 'Mozilla/5.0 (Linux; Android 8.1; PAFM00 Build/OPM1.171019.026) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Mobile Safari/537.36',
    expected: { vendor: 'OPPO', model: 'PAFM00', type: 'mobile' },
  },
  {
    desc: 'OPPO Find 7a',
    ua: 'Mozilla/5.0 (Linux; U; Android 4.3; xx-xx; X9007 Build/JLS36C) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
    expected: { vendor: 'OPPO', model: 'X9007', type: 'mobile' },
  },
  {
    desc: 'OPPO Watch 46mm',
    ua: 'Mozilla/5.0 (Linux; Android 8.1.0; OW19W3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.137 Mobile Safari/537.36',
    expected: { vendor: 'OPPO', model: 'OW19W3', type: 'wearable' },
  },
  {
    desc: 'OPPO Watch 41mm',
    ua: 'Mozilla/5.0 (Linux; Android 8.1.0; OW19W2 Build/OPM1.171019.011; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/61.0.3163.98 Mobile Safari/537.36',
    expected: { vendor: 'OPPO', model: 'OW19W2', type: 'wearable' },
  },
  {
    desc: 'OPPO Watch 2',
    ua: 'Mozilla/5.0 (Linux; Android 8.1.0; OW20W1 Build/OPM1.171019.026.11_A.37.210713172937; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/61.0.3163.98 Mobile Safari/537.36',
    expected: { vendor: 'OPPO', model: 'OW20W1', type: 'wearable' },
  },
  {
    desc: 'OPPO Watch X',
    ua: 'Dalvik/2.1.0 (Linux; U; Android 13; OWWE231 Build/TWR7.231113.001.OWWE231_11_A.117.240703)',
    expected: { vendor: 'OPPO', model: 'OWWE231', type: 'wearable' },
  },
  {
    desc: 'Realme C1',
    ua: 'Mozilla/5.0 (Linux; Android 8.1; RMX1811 Build/OPM1.171019.026) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.126 Mobile Safari/537.36',
    expected: { vendor: 'Realme', model: 'RMX1811', type: 'mobile' },
  },
  {
    desc: 'Realme C2',
    ua: 'Mozilla/5.0 (Linux; Android 9; RMX1941) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Mobile Safari/537.36',
    expected: { vendor: 'Realme', model: 'RMX1941', type: 'mobile' },
  },
  {
    desc: 'Realme Narzo 20',
    ua: 'Mozilla/5.0 (Linux; U; Android 10; xx-xx; RMX2193 Build/QP1A.190711.020) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/70.0.3538.80 Mobile Safari/537.36',
    expected: { vendor: 'Realme', model: 'RMX2193', type: 'mobile' },
  },
  {
    desc: 'Realme 2 Pro',
    ua: 'Mozilla/5.0 (Linux; Android 9; RMX1801) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.136 Mobile Safari/537.36',
    expected: { vendor: 'Realme', model: 'RMX1801', type: 'mobile' },
  },
  {
    desc: 'Realme 3 Pro',
    ua: 'Mozilla/5.0 (Linux; Android 11; RMX1851) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Mobile Safari/537.36',
    expected: { vendor: 'Realme', model: 'RMX1851', type: 'mobile' },
  },
  {
    desc: 'Realme 8',
    ua: 'Mozilla/5.0 (Linux; Android 12; RMX3085) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Mobile Safari/537.36',
    expected: { vendor: 'Realme', model: 'RMX3085', type: 'mobile' },
  },
  {
    desc: 'Realme 9 Pro',
    ua: 'Mozilla/5.0 (Linux; Android 13; RMX3471) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Mobile Safari/537.36',
    expected: { vendor: 'Realme', model: 'RMX3471', type: 'mobile' },
  },
  {
    desc: 'Realme GT Master',
    ua: 'Mozilla/5.0 (Linux; Android 13; RMX3363) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Mobile Safari/537.36',
    expected: { vendor: 'Realme', model: 'RMX3363', type: 'mobile' },
  },
  {
    desc: 'Panasonic T31',
    ua: 'Mozilla/5.0 (Linux; Android 4.2.2; Panasonic T31 Build/JDQ39) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/33.0.1750.170 Mobile Safari/537.36 ',
    expected: { vendor: 'Panasonic', model: 'T31', type: 'mobile' },
  },
  {
    desc: 'Panasonic TX-32CSW514 SmartTV',
    ua: 'HbbTV/1.2.1 (;Panasonic;VIERA 2015;3.014;a001-003 4000-0000;)',
    expected: { vendor: 'Panasonic', model: 'VIERA 2015', type: 'smarttv' },
  },
  {
    desc: 'Panasonic TX-40FXW724 SmartTV',
    ua: 'HbbTV/1.4.1 (+DRM;Panasonic;SmartTV2018mid;3.024;4301-0003 0002-0000;SmartTV2018;)',
    expected: { vendor: 'Panasonic', model: 'SmartTV2018mid', type: 'smarttv' },
  },
  {
    desc: 'Panasonic TX-43HXW904 SmartTV',
    ua: 'HbbTV/1.5.1 (+DRM;Panasonic;SmartTV2020mid;3.326;4301-0003 0008-0000;com.panasonic.SmartTV2020mid;)',
    expected: { vendor: 'Panasonic', model: 'SmartTV2020mid', type: 'smarttv' },
  },
  {
    desc: 'Panasonic DMR-HST130 SAT receiver',
    ua: 'HbbTV/1.1.1 (+PVR;Panasonic;DIGA WebKit M8658;3.420;;)',
    expected: { vendor: 'Panasonic', model: 'DIGA WebKit M8658', type: 'smarttv' },
  },
  {
    desc: 'Philips SmartTV',
    ua: 'Opera/9.80 HbbTV/1.1.1 (; Philips; ; ; ; ) NETTV/4.0.2; en) Version/11.60',
    expected: { vendor: 'Philips', model: '', type: 'smarttv' },
  },
  {
    desc: 'Philips 32PFL6606K/02 SmartTV (2011)',
    ua: 'Opera/9.80 (Linux mips ; U; HbbTV/1.1.1 (; Philips; ; ; ; ) CE-HTML/1.0 NETTV/3.1.0; en) Presto/2.6.33 Version/10.70',
    expected: { vendor: 'Philips', model: '', type: 'smarttv' },
  },
  {
    desc: 'Philips 32PFL6606K/02 SmartTV (2013)',
    ua: 'Opera/9.80 (Linux mips ; U; HbbTV/1.1.1 (; Philips; ; ; ; ) CE-HTML/1.0 NETTV/3.1.0; en) Presto/2.6.33 Version/10.70',
    expected: { vendor: 'Philips', model: '', type: 'smarttv' },
  },
  {
    desc: 'Philips 32PHS5301/12 SmartTV (2016)',
    ua: 'Mozilla/5.0 (Linux armv7l) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.152 Safari/537.36 OPR/29.0.1803.0 OMI/4.5.23.37.MOT2.13 HbbTV/1.2.1 (;Philips;32PHS5301/12;;_TV_MT5800;) Firmware/TPM161E_012.002.045.001 en',
    expected: { vendor: 'Philips', model: '32PHS5301/12', type: 'smarttv' },
  },
  {
    desc: 'Pico 4',
    ua: 'Mozilla/5.0 (X11; Linux x86_64; PICO 4 OS5.8.2 like Quest) AppleWebKit/537.36 (KHTML, like Gecko) PicoBrowser/3.3.38 Chrome/105.0.5195.68 VR Safari/537.36',
    expected: { vendor: 'PICO', model: '4', type: 'wearable' },
  },
  {
    desc: 'Pico 4',
    ua: 'Mozilla/5.0 (X11; Linux x86_64; PICO 4 OS5.4.0 like Quest) AppleWebKit/537.36 (KHTML, like Gecko) PicoBrowser/3.3.22 Chrome/105.0.5195.68 VR Safari/537.36 OculusBrowser/7.0',
    expected: { vendor: 'PICO', model: '4', type: 'wearable' },
  },
  {
    desc: 'Pico Neo3 Link',
    ua: 'Mozilla/5.0 (X11; Linux x86_64; Pico Neo3 Link OS5.8.4.0 like Quest) AppleWebKit/537.36 (KHTML, like Gecko) PicoBrowser/3.3.22 Chrome/105.0.5195.68 VR Safari/537.36',
    expected: { vendor: 'Pico', model: 'Neo3 Link', type: 'wearable' },
  },
  {
    desc: 'Polytron Prime 7 Pro',
    ua: 'Mozilla/5.0 (Linux; U; Android 7.0; POLYTRON_P552 Build/NRD90M; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/64.0.3282.137 Mobile Safari/537.36 OPR/50.0.2254.149182',
    expected: { vendor: 'POLYTRON', model: 'P552', type: 'mobile' },
  },
  {
    desc: 'Polytron Rocket T1',
    ua: 'Mozilla/5.0 (Linux; U; Android 5.0; en-US; POLYTRON R2501 Build/LRX21M) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/57.0.2987.108 UCBrowser/13.1.2.1293 Mobile Safari/537.36',
    expected: { vendor: 'POLYTRON', model: 'R2501', type: 'mobile' },
  },
  {
    desc: 'Polytron Rocket T6',
    ua: 'Mozilla/5.0 (Linux; Android 7.0; POLYTRON R2509) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.92 Mobile Safari/537.36',
    expected: { vendor: 'POLYTRON', model: 'R2509', type: 'mobile' },
  },
  {
    desc: 'Polytron Zap 6 Posh',
    ua: 'Mozilla/5.0 (Linux; U; Android 5.1; in-ID; POLYTRON_4G501 Build/LMY47D) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/57.0.2987.108 UCBrowser/12.10.0.1163 UCTurbo/1.9.9.900 Mobile Safari/537.36',
    expected: { vendor: 'POLYTRON', model: '4G501', type: 'mobile' },
  },
  {
    desc: 'Roku',
    ua: 'Mozilla/5.0 (Roku) AppleWebKit/537.36 (KHTML, like Gecko) Web/1.1 Safari/537.36',
    expected: { vendor: 'Roku', model: '', type: 'smarttv' },
  },
  {
    desc: 'Roku',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.77 Safari/537.36 Roku/DVP-8.10 (468.10E04145A)',
    expected: { vendor: 'Roku', model: 'DVP-8.10', type: 'smarttv' },
  },
  {
    desc: 'Roku',
    ua: 'Roku4640X/DVP-7.70 (297.70E04154A)',
    expected: { vendor: 'Roku', model: 'DVP-7.70', type: 'smarttv' },
  },
  {
    desc: 'Xiaomi TV',
    ua: 'Mozilla/5.0 (Linux; Android 10; MiTV-MOOQ0 Build/QTG3.200305.006; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/94.0.4606.61 Mobile Safari/537.36',
    expected: { vendor: 'Xiaomi', model: 'MiTV-MOOQ0', type: 'smarttv' },
  },
  {
    desc: 'Xiaomi Mi TV',
    ua: 'Mozilla/5.0 (Linux; Android 9; MiTV4I Build/PI; en-in) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Mobile Safari/537.36 Puffin/7.8.3.40913AP',
    expected: { vendor: 'Xiaomi', model: 'MiTV4I', type: 'smarttv' },
  },
  {
    desc: 'Xiaomi Mi Box',
    ua: 'Mozilla/5.0 (Linux; Android 9; MIBOX3 Build/PI; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/119.0.6045.193 Mobile Safari/537.36',
    expected: { vendor: 'Xiaomi', model: 'MIBOX3', type: 'smarttv' },
  },
  {
    desc: 'Kindle Fire HD',
    ua: 'Mozilla/5.0 (Linux; U; Android 4.0.3; en-us; KFTT Build/IML74K) AppleWebKit/535.19 (KHTML, like Gecko) Silk/3.4 Mobile Safari/535.19 Silk-Accelerated=true',
    expected: { vendor: 'Amazon', model: 'KFTT', type: 'tablet' },
  },
  {
    desc: 'Kindle Fire HD',
    ua: 'Mozilla/5.0 (Linux; U; Android 4.0.3; en-us; KFTT) AppleWebKit/535.19 (KHTML, like Gecko) Silk/3.4 Mobile Safari/535.19 Silk-Accelerated=true',
    expected: { vendor: 'Amazon', model: 'KFTT', type: 'tablet' },
  },
  {
    desc: 'Echo Show 5',
    ua: 'Mozilla/5.0 (Linux; Android 5.1; AEORK Build/LVY48F; xx-xx) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/70.0.3538.110 Mobile Safari/537.36',
    expected: { vendor: 'Amazon', model: 'AEORK', type: 'tablet' },
  },
  {
    desc: 'Echo Show 8',
    ua: 'Mozilla/5.0 (Linux; Android 7.1; AEOCH) AppleWebKit/537.36 (KHTML, like Gecko) Silk/77.2.21 like Chrome/77.0.3865.92 Mobile Safari/537.36',
    expected: { vendor: 'Amazon', model: 'AEOCH', type: 'tablet' },
  },
  {
    desc: 'Echo Show 8',
    ua: 'Mozilla/5.0 (Linux; Android 7.1.2; AEOCW) AppleWebKit/537.36 (KHTML, like Gecko) Silk/106.3.3 like Chrome/106.0.5249.170 Safari/537.36',
    expected: { vendor: 'Amazon', model: 'AEOCW', type: 'tablet' },
  },
  {
    desc: 'Echo Show 15',
    ua: 'Mozilla/5.0 (Linux; Android 9; AEOHY) AppleWebKit/537.36 (KHTML, like Gecko) Silk/112.6.3 like Chrome/112.0.5615.213 Safari/537.36',
    expected: { vendor: 'Amazon', model: 'AEOHY', type: 'tablet' },
  },
  {
    desc: 'Echo Dot',
    ua: 'Dalvik/2.1.0 (Linux; U; Android 5.1.1; AEOBC Build/LVY48F)',
    expected: { vendor: 'Amazon', model: 'AEOBC', type: 'embedded' },
  },
  {
    desc: 'Samsung Galaxy A21s',
    ua: 'Mozilla/5.0 (Linux; Android 10; SAMSUNG SM-A217F) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/11.0 Chrome/75.0.3770.143 Mobile Safari/537.36',
    expected: { vendor: 'Samsung', model: 'SM-A217F', type: 'mobile' },
  },
  {
    desc: 'Samsung Galaxy A31',
    ua: 'Mozilla/5.0 (Linux; Android 10; SM-A315G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Mobile Safari/537.36',
    expected: { vendor: 'Samsung', model: 'SM-A315G', type: 'mobile' },
  },
  {
    desc: 'Samsung Galaxy A50',
    ua: 'Mozilla/5.0 (Linux; Android 9; SM-A505F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.105 Mobile Safari/537.36',
    expected: { vendor: 'Samsung', model: 'SM-A505F', type: 'mobile' },
  },
  {
    desc: 'Samsung Galaxy A50s',
    ua: 'Mozilla/5.0 (Linux; Android 11; SM-A507FN) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Mobile Safari/537.36',
    expected: { vendor: 'Samsung', model: 'SM-A507FN', type: 'mobile' },
  },
  {
    desc: 'Samsung Galaxy A52s',
    ua: 'Mozilla/5.0 (Linux; Android 13; SM-A528B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Mobile Safari/537.36',
    expected: { vendor: 'Samsung', model: 'SM-A528B', type: 'mobile' },
  },
  {
    desc: 'Samsung Galaxy A80',
    ua: 'Mozilla/5.0 (Linux; Android 9; SM-A805F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.112 Mobile Safari/537.36',
    expected: { vendor: 'Samsung', model: 'SM-A805F', type: 'mobile' },
  },
  {
    desc: 'Samsung Galaxy Fold',
    ua: 'Mozilla/5.0 (Linux; Android 9; SAMSUNG SM-F900U Build/PPR1.180610.011) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/9.2 Chrome/67.0.3396.87 Mobile Safari/537.36',
    expected: { vendor: 'Samsung', model: 'SM-F900U', type: 'mobile' },
  },
  {
    desc: 'Samsung Galaxy Z Flip',
    ua: 'Mozilla/5.0 (Linux; Android 10; SM-F700N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.136 Mobile Safari/537.36',
    expected: { vendor: 'Samsung', model: 'SM-F700N', type: 'mobile' },
  },
  {
    desc: 'Samsung Galaxy Z Fold2',
    ua: 'Mozilla/5.0 (Linux; Android 10; SM-F916B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Mobile Safari/537.36',
    expected: { vendor: 'Samsung', model: 'SM-F916B', type: 'mobile' },
  },
  {
    desc: 'Samsung Galaxy S10E',
    ua: 'Mozilla/5.0 (Linux; Android 9; SM-G970F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.110 Mobile Safari/537.36',
    expected: { vendor: 'Samsung', model: 'SM-G970F', type: 'mobile' },
  },
  {
    desc: 'Samsung Galaxy S20 5G',
    ua: 'Mozilla/5.0 (Linux; Android 10; SCG01) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.127 Mobile Safari/537.36',
    expected: { vendor: 'Samsung', model: 'SCG01', type: 'mobile' },
  },
  {
    desc: 'Samsung Galaxy Note 10+',
    ua: 'Mozilla/5.0 (Linux; Android 9; SM-N976V) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.89 Mobile Safari/537.36',
    expected: { vendor: 'Samsung', model: 'SM-N976V', type: 'mobile' },
  },
  {
    desc: 'Samsung SM-C5000',
    ua: 'Mozilla/5.0 (Linux; Android 6.0.1; SM-C5000 Build/MMB29M; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/51.0.2704.81 Mobile Safari/537.36 wkbrowser 4.1.35 3065',
    expected: { vendor: 'Samsung', model: 'SM-C5000', type: 'mobile' },
  },
  {
    desc: 'Samsung C8',
    ua: 'Mozilla/5.0 (Linux; Android 7.1.1; SM-C7108) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Mobile Safari/537.36',
    expected: { vendor: 'Samsung', model: 'SM-C7108', type: 'mobile' },
  },
  {
    desc: 'Samsung Galaxy Note 8',
    ua: 'Mozilla/5.0 (Linux; Android 4.2.2; GT-N5100 Build/JDQ39) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.141 Safari/537.36',
    expected: { vendor: 'Samsung', model: 'GT-N5100', type: 'tablet' },
  },
  {
    desc: 'Samsung SM-T231',
    ua: 'Mozilla/5.0 (Linux; Android 4.4.2; SM-T231 Build/KOT49H) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/36.0.1985.135 Safari/537.36',
    expected: { vendor: 'Samsung', model: 'SM-T231', type: 'tablet' },
  },
  {
    desc: 'Samsung Galaxy Tab 6 Lite',
    ua: 'Mozilla/5.0 (Linux; Android 10; SAMSUNG SM-P610) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/12.0 Chrome/79.0.3945.136 Safari/537.36',
    expected: { vendor: 'Samsung', model: 'SM-P610', type: 'tablet' },
  },
  {
    desc: 'Samsung Galaxy Tab A 9.7',
    ua: 'Mozilla/5.0 (Linux; Android 7.1.1; SM-P550 Build/NMF26X; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/89.0.4389.90 Safari/537.36',
    expected: { vendor: 'Samsung', model: 'SM-P550', type: 'tablet' },
  },
  {
    desc: 'Samsung Galaxy Tab A 10.1',
    ua: ' Mozilla/5.0 (Linux; Android 10; SAMSUNG SM-T515) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/13.0 Chrome/83.0.4103.106 Safari/537.36',
    expected: { vendor: 'Samsung', model: 'SM-T515', type: 'tablet' },
  },
  {
    desc: 'Samsung Galaxy Tab S7',
    ua: 'Mozilla/5.0 (Linux; Android 10; SM-T870) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.89 Safari/537.36',
    expected: { vendor: 'Samsung', model: 'SM-T870', type: 'tablet' },
  },
  {
    desc: 'Samsung Galaxy Tab S8',
    ua: 'Mozilla/5.0 (Linux; Android 12; SM-X706B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.5060.53 Safari/537.36',
    expected: { vendor: 'Samsung', model: 'SM-X706B', type: 'tablet' },
  },
  {
    desc: 'Samsung Galaxy Tab S',
    ua: 'Mozilla/5.0 (Linux; Android 4.4.2; SM-T700 Build/KOT49H) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/36.0.1985.135 Safari/537.36',
    expected: { vendor: 'Samsung', model: 'SM-T700', type: 'tablet' },
  },
  {
    desc: 'Samsung Galaxy Tab Pro 10.1',
    ua: 'Mozilla/5.0 (Linux; Android 4.4.2; SM-T520 Build/KOT49H) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/36.0.1985.135 Safari/537.36',
    expected: { vendor: 'Samsung', model: 'SM-T520', type: 'tablet' },
  },
  {
    desc: 'Samsung Galaxy Watch',
    ua: 'Mozilla/5.0 (Linux; Tizen 5.5; SAMSUNG SM-R805W) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/2.0 Chrome/69.0.3497.106 Mobile Safari/537.36',
    expected: { vendor: 'Samsung', model: 'SM-R805W', type: 'wearable' },
  },
  {
    desc: 'Samsung Galaxy Watch Active 2',
    ua: 'Mozilla/5.0 (Linux; Tizen 5.5; SAMSUNG SM-R820) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/2.0 Chrome/69.0.3497.106 Mobile Safari/537.36',
    expected: { vendor: 'Samsung', model: 'SM-R820', type: 'wearable' },
  },
  {
    desc: 'Samsung Galaxy Watch4',
    ua: 'Mozilla/5.0 (Linux; Android 11; SAMSUNG SM-R875U) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/2.2. Chrome/102.0.5005.125 Mobile Safari/537.36',
    expected: { vendor: 'Samsung', model: 'SM-R875U', type: 'wearable' },
  },
  {
    desc: 'Samsung Galaxy Watch5 Pro',
    ua: 'Mozilla/5.0 (Linux; Android 11; SAMSUNG SM-R925U) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/3.2. Chrome/111.0.5563.116 Mobile Safari/537.36',
    expected: { vendor: 'Samsung', model: 'SM-R925U', type: 'wearable' },
  },
  {
    desc: 'Samsung Galaxy Watch7',
    ua: 'Dalvik/2.1.0 (Linux; U; Android 14; SM-L300 Build/AW2E.240318.016)',
    expected: { vendor: 'Samsung', model: 'SM-L300', type: 'wearable' },
  },
  {
    desc: 'Samsung Note 10.1',
    ua: 'Mozilla/5.0 (Linux; Android 5.1.1; SM-P605) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.106 Safari/537.36',
    expected: { vendor: 'Samsung', model: 'SM-P605', type: 'tablet' },
  },
  {
    desc: 'Samsung SmartTV2011',
    ua: 'HbbTV/1.1.1 (;;;;;) Maple;2011',
    expected: { vendor: 'Samsung', model: 'SmartTV2011', type: 'smarttv' },
  },
  {
    desc: 'Samsung SmartTV2012',
    ua: 'HbbTV/1.1.1 (;Samsung;SmartTV2012;;;) WebKit',
    expected: { vendor: 'Samsung', model: 'SmartTV2012', type: 'smarttv' },
  },
  {
    desc: 'Samsung SmartTV2014',
    ua: 'HbbTV/1.1.1 (;Samsung;SmartTV2014;T-NT14UDEUC-1060.4;;) WebKit',
    expected: { vendor: 'Samsung', model: 'SmartTV2014', type: 'smarttv' },
  },
  {
    desc: 'Samsung SmartTV',
    ua: 'Mozilla/5.0 (SMART-TV; X11; Linux armv7l) AppleWebkit/537.42 (KHTML, like Gecko) Safari/537.42',
    expected: { type: 'smarttv' },
  },
  {
    desc: 'Samsung SmartTV',
    ua: 'Mozilla/5.0 (SMART-TV; Linux; Tizen 2.3) AppleWebkit/538.1 (KHTML, like Gecko) SamsungBrowser/1.0 TV Safari/538.1',
    expected: { vendor: 'Samsung', type: 'smarttv' },
  },
  {
    desc: 'Samsung SmartTV HBBTV',
    ua: 'HbbTV/1.5.1 (+DRM;Samsung;SmartTV2021:UAU7000;T-KSU2EDEUC-1506.0;KantSU2e;urn:samsungtv:familyname:21_KANTSU2E_UHD_BASIC:2021;) Tizen/6.0 (+TVPLUS+SmartHubLink) Chrome/76 LaTivu_1.0.1_2021 RVID/17',
    expected: { vendor: 'Samsung', model: 'SmartTV2021:UAU7000', type: 'smarttv' },
  },
  {
    desc: 'Sharp AQUOS-TVX19B',
    ua: 'Mozilla/5.0 (Linux; Android 9; AQUOS-TVX19B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Mobile Safari/537.36',
    expected: { vendor: 'Sharp', model: 'AQUOS-TVX19B', type: 'smarttv' },
  },
  {
    desc: 'Sharp Aquos B10',
    ua: 'Mozilla/5.0 (Linux; Android 7.0; SH-A01) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Mobile Safari/537.36',
    expected: { vendor: 'Sharp', model: 'SH-A01', type: 'mobile' },
  },
  {
    desc: 'Sharp Aquos L2',
    ua: 'Mozilla/5.0 (Linux; Android 7.0; SH-L02 Build/S4045) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Mobile Safari/537.36',
    expected: { vendor: 'Sharp', model: 'SH-L02', type: 'mobile' },
  },
  {
    desc: 'Sharp Aquos L2',
    ua: 'Mozilla/5.0 (Linux; Android 7.0; SH-L02) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    expected: { vendor: 'Sharp', model: 'SH-L02', type: 'mobile' },
  },
  {
    desc: 'Sharp Aquos R2',
    ua: 'Mozilla/5.0 (Linux; Android 8.0; SHV42) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.92 Mobile Safari/537.36',
    expected: { vendor: 'Sharp', model: 'SHV42', type: 'mobile' },
  },
  {
    desc: 'Smartfren Andromax L',
    ua: 'Mozilla/5.0 (Linux; Android 6.0.1; Andromax B26D2H) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.127 Mobile Safari/537.36',
    expected: { vendor: 'Smartfren', model: 'Andromax B26D2H', type: 'mobile' },
  },
  {
    desc: 'Smartfren Andromax G2',
    ua: 'Mozilla/5.0 (Linux; Android 4.4.2; Smartfren Andromax AD9A1H) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.83 Mobile Safari/537.36',
    expected: { vendor: 'Smartfren', model: 'Andromax AD9A1H', type: 'mobile' },
  },
  {
    desc: 'Smartfren New Andromax I',
    ua: 'Mozilla/5.0 (Linux; U; Android 4.1.2; id-id; New Andromax-i Build/JZO54K) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
    expected: { vendor: 'Smartfren', model: 'New Andromax-i', type: 'mobile' },
  },
  {
    desc: 'SONY Xperia 1 III',
    ua: 'Mozilla/5.0 (Linux; Android 11; A101SO) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Mobile Safari/537.36',
    expected: { vendor: 'Sony', model: 'A101SO', type: 'mobile' },
  },
  {
    desc: 'Sony G8141 (Xperia XZ1)',
    ua: 'Mozilla/5.0 (Linux; Android 9; SO-01K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Mobile Safari/537.36',
    expected: { vendor: 'Sony', model: 'SO-01K', type: 'mobile' },
  },
  {
    desc: 'Sony G8141 (Xperia XZ Premium)',
    ua: 'Mozilla/5.0 (Linux; Android 8.0.0; G8141) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.80 Mobile Safari/537.36',
    expected: { vendor: 'Sony', model: 'G8141', type: 'mobile' },
  },
  {
    desc: 'Sony C5303 (Xperia SP)',
    ua: 'Mozilla/5.0 (Linux; Android 4.3; C5303 Build/12.1.A.1.205) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.93 Mobile Safari/537.36',
    expected: { vendor: 'Sony', model: 'C5303', type: 'mobile' },
  },
  {
    desc: 'Sony SO-02F (Xperia Z1 F)',
    ua: 'Mozilla/5.0 (Linux; Android 4.2.2; SO-02F Build/14.1.H.2.119) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/34.0.1847.114 Mobile Safari/537.36',
    expected: { vendor: 'Sony', model: 'SO-02F', type: 'mobile' },
  },
  {
    desc: 'Sony D6653 (Xperia Z3)',
    ua: 'Mozilla/5.0 (Linux; Android 4.4; D6653 Build/23.0.A.0.376) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.141 Mobile Safari/537.36',
    expected: { vendor: 'Sony', model: 'D6653', type: 'mobile' },
  },
  {
    desc: 'Sony Xperia SOL25 (ZL2)',
    ua: 'Mozilla/5.0 (Linux; U; Android 4.4; SOL25 Build/17.1.1.C.1.64) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
    expected: { vendor: 'Sony', model: 'SOL25', type: 'mobile' },
  },
  {
    desc: 'Sony Xperia SP',
    ua: 'Mozilla/5.0 (Linux; Android 4.3; C5302 Build/12.1.A.1.201) AppleWebkit/537.36 (KHTML, like Gecko) Chrome/34.0.1847.114 Mobile Safari/537.36',
    expected: { vendor: 'Sony', model: 'C5302', type: 'mobile' },
  },
  {
    desc: 'Sony Xperia L4',
    ua: 'Mozilla/5.0 (Linux; Android 9; XQ-AD51) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.83 Mobile Safari/537.36',
    expected: { vendor: 'Sony', model: 'XQ-AD51', type: 'mobile' },
  },
  {
    desc: 'Sony Xperia 1ii',
    ua: 'Mozilla/5.0 (Linux; Android 10; XQ-AT51) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.106 Mobile Safari/537.36',
    expected: { vendor: 'Sony', model: 'XQ-AT51', type: 'mobile' },
  },
  {
    desc: 'Sony Xperia 1ii',
    ua: 'Mozilla/5.0 (Linux; Android 10; SOG01) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.127 Mobile Safari/537.36',
    expected: { vendor: 'Sony', model: 'SOG01', type: 'mobile' },
  },
  {
    desc: 'Sony Xperia 10ii',
    ua: 'Mozilla/5.0 (Linux; Android 10; XQ-AU52) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Mobile Safari/537.36',
    expected: { vendor: 'Sony', model: 'XQ-AU52', type: 'mobile' },
  },
  {
    desc: 'Sony Xperia Pro',
    ua: 'Mozilla/5.0 (Linux; Android 10; XQ-AQ52) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.185 Mobile Safari/537.36',
    expected: { vendor: 'Sony', model: 'XQ-AQ52', type: 'mobile' },
  },
  {
    desc: 'Sony SGP521 (Xperia Z2 Tablet)',
    ua: 'Mozilla/5.0 (Linux; Android 4.4; SGP521 Build/17.1.A.0.432) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/32.0.1700.99 Safari/537.36',
    expected: { vendor: 'Sony', model: 'Xperia Tablet', type: 'tablet' },
  },
  {
    desc: 'Sony Xperia Z2 Tablet',
    ua: 'Mozilla/5.0 (Linux; Android 5.1.1; SGP561) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.99 Safari/537.36',
    expected: { vendor: 'Sony', model: 'Xperia Tablet', type: 'tablet' },
  },
  {
    desc: 'Sony Tablet S',
    ua: 'Mozilla/5.0 (Linux; U; Android 3.1; Sony Tablet S Build/THMAS10000) AppleWebKit/534.13 (KHTML, like Gecko) Version/4.0 Safari/534.13',
    expected: { vendor: 'Sony', model: 'Xperia Tablet', type: 'tablet' },
  },
  {
    desc: 'Sony Tablet Z LTE',
    ua: 'Mozilla/5.0 (Linux; U; Android 4.1; SonySGP321 Build/10.2.C.0.143) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Safari/534.30',
    expected: { vendor: 'Sony', model: 'Xperia Tablet', type: 'tablet' },
  },
  {
    desc: 'Sony BRAVIA 4K GB ATV3',
    ua: 'Mozilla/5.0 (Linux; Andr0id 9; BRAVIA 4K GB ATV3 Build/PTT1.190515.001.S38) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36 OPR/46.0.2207.0 OMI/4.13.0.180.DIA5.104 Model/Sony-BRAVIA-4K-GB-ATV3',
    expected: { vendor: 'Sony', model: 'BRAVIA 4K GB ATV3', type: 'smarttv' },
  },
  {
    desc: 'Sony BRAVIA 4K GB ATV3',
    ua: 'Mozilla/5.0 (Linux; Android 9; BRAVIA 4K GB ATV3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Mobile Safari/537.36',
    expected: { vendor: 'Sony', model: 'BRAVIA 4K GB ATV3', type: 'smarttv' },
  },
  {
    desc: 'Sony Bravia 4k UR2',
    ua: 'Mozilla/5.0 (Linux: Andr0id 9: BRAVIA 4K UR2 Build/PTT1.190515.001.S104) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36 OPR/46.0.2207.0 OMI/4.13.5.431.DIA5HBBTV.250 Model/Sony-BRAVIA-4K-UR2',
    expected: { vendor: 'Sony', model: 'BRAVIA 4K UR2', type: 'smarttv' },
  },
  {
    desc: 'Sony SmartWatch 3',
    ua: 'Mozilla/5.0 (Linux; Android 5.0.2; SmartWatch 3 Build/LWX49K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/19.77.34.5 Mobile Safari/537.36',
    expected: { vendor: 'Sony', model: 'SmartWatch 3', type: 'wearable' },
  },
  {
    desc: 'TCL 10 TabMax',
    ua: 'Mozilla/5.0 (Linux; Android 11; 9296Q) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
    expected: { vendor: 'TCL', model: '9296Q', type: 'tablet' },
  },
  {
    desc: 'TCL 10 TabMax 4G',
    ua: 'Mozilla/5.0 (Linux; Android 10; 9295G_EEA) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
    expected: { vendor: 'TCL', model: '9295G', type: 'tablet' },
  },
  {
    desc: 'TCL 10 TabMax WiFi',
    ua: 'Mozilla/5.0 (Linux; Android 10; 9296G_TR) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.101 Safari/537.36',
    expected: { vendor: 'TCL', model: '9296G', type: 'tablet' },
  },
  {
    desc: 'TCL NxtPaper 11',
    ua: 'Mozilla/5.0 (Linux; Android 13; 9466X Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.6478.179 Safari/537.36 [FB_IAB/FB4A;FBAV/473.0.0.41.81;]',
    expected: { vendor: 'TCL', model: '9466X', type: 'tablet' },
  },
  {
    desc: 'TCL Tab 8 4G',
    ua: 'Mozilla/5.0 (Linux; Android 10; 9048S) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36',
    expected: { vendor: 'TCL', model: '9048S', type: 'tablet' },
  },
  {
    desc: 'TCL Tab 8 LE',
    ua: 'Mozilla/5.0 (Linux; Android 12; 9137W Build/SP1A.210812.016; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/114.0.5735.61 Mobile Safari/537.36',
    expected: { vendor: 'TCL', model: '9137W', type: 'tablet' },
  },
  {
    desc: 'TCL Tab 10 FHD 4G',
    ua: 'Mozilla/5.0 (Linux; Android 11; 9060G Build/RP1A.200720.011; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/114.0.5735.196 Safari/537.36',
    expected: { vendor: 'TCL', model: '9060G', type: 'tablet' },
  },
  {
    desc: 'TCL Tab 10 HD 4G',
    ua: 'Mozilla/5.0 (Linux; Android 11; 9060X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36',
    expected: { vendor: 'TCL', model: '9060X', type: 'tablet' },
  },
  {
    desc: 'TCL Tab 10 LTE',
    ua: 'Mozilla/5.0 (Linux; Android 13; 8196G Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.6478.162 Safari/537.36 [FB_IAB/FB4A;FBAV/471.0.0.35.80;]',
    expected: { vendor: 'TCL', model: '8196G', type: 'tablet' },
  },
  {
    desc: 'TCL Tab 10 WiFi',
    ua: 'Mozilla/5.0 (Linux; Android 13; 8496G Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/127.0.6533.61 Safari/537.36 [FB_IAB/FB4A;FBAV/474.0.0.52.74;]',
    expected: { vendor: 'TCL', model: '8496G', type: 'tablet' },
  },
  {
    desc: 'TCL Tab 10L',
    ua: 'Mozilla/5.0 (Linux; Android 11; 8491X_EEA Build/RP1A.200720.011; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/107.0.5304.105 Safari/537.36',
    expected: { vendor: 'TCL', model: '8491X', type: 'tablet' },
  },
  {
    desc: 'TCL Tab 10s 4G',
    ua: 'Mozilla/5.0 (Linux; Android 11; 9080G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
    expected: { vendor: 'TCL', model: '9080G', type: 'tablet' },
  },
  {
    desc: 'Tecno KC8',
    ua: 'Mozilla/5.0 (Linux; Android 10; TECNO KC8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Mobile Safari/537.36',
    expected: { vendor: 'TECNO', model: 'KC8', type: 'mobile' },
  },
  {
    desc: 'Tesla',
    ua: 'Mozilla/5.0 (X11; GNU/Linux) AppleWebKit/601.1 (KHTML, like Gecko) Tesla QtCarBrowser Safari/601.1',
    expected: { vendor: 'Tesla', type: 'embedded' },
  },
  {
    desc: 'Tesla',
    ua: 'Mozilla/5.0 (X11; GNU/Linux) AppleWebKit/537.36 (KHTML, like Gecko) Chromium/79.0.3945.130 Chrome/79.0.3945.130 Safari/537.36 Tesla/2020.16.2.1-e99c70fff409',
    expected: { vendor: 'Tesla', type: 'embedded' },
  },
  {
    desc: 'TechniSAT Digit ISIO S SAT receiver',
    ua: 'Opera/9.80 (Linux sh4; U; HbbTV/1.1.1 (;;;;;); CE-HTML; TechniSat Digit ISIO S; de) Presto/2.9.167 Version/11.50',
    expected: { vendor: 'TechniSat', model: 'Digit ISIO S', type: 'smarttv' },
  },
  {
    desc: 'TechniSAT MultyVision SmartTV',
    ua: 'Opera/9.80 (Linux i686; U; HbbTV/1.1.1 (;;;;;); CE-HTML; TechniSat MultyVision ISIO; de) Presto/2.9.167 Version/11.50',
    expected: { vendor: 'TechniSat', model: 'MultyVision ISIO', type: 'smarttv' },
  },
  {
    desc: 'Ulefone Armor',
    ua: 'Mozilla/5.0 (Linux; Android 6.0; Armor Build/MRA58K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.107 Mobile Safari/537.36',
    expected: { vendor: 'Ulefone', model: 'Armor', type: 'mobile' },
  },
  {
    desc: 'Ulefone Armor',
    ua: 'Mozilla/5.0 (Linux; arm_64; Android 6.0; Armor) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 YaBrowser/20.4.2.101.00 SA/1 Mobile Safari/537.36',
    expected: { vendor: 'Ulefone', model: 'Armor', type: 'mobile' },
  },
  {
    desc: 'Ulefone Armor 8 Pro',
    ua: 'Mozilla/5.0 (Linux; Android 11; Armor 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.5481.192 Mobile Safari/537.36 OPR/74.1.3922.71199',
    expected: { vendor: 'Ulefone', model: 'Armor 8 Pro', type: 'mobile' },
  },
  {
    desc: 'Ulefone Armor 12 5G',
    ua: 'Mozilla/5.0 (Linux; Android 11; Armor 12 5G Build/RP1A.200720.011; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/115.0.5790.166 Mobile Safari/537.36',
    expected: { vendor: 'Ulefone', model: 'Armor 12 5G', type: 'mobile' },
  },
  {
    desc: 'Ulefone Armor 20WT',
    ua: 'Mozilla/5.0 (Linux; Android 12; Armor 20WT) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/22.0 Chrome/111.0.5563.116 Mobile Safari/537.36',
    expected: { vendor: 'Ulefone', model: 'Armor 20WT', type: 'mobile' },
  },
  {
    desc: 'Ulefone Armor Pad',
    ua: 'Mozilla/5.0 (Linux; Android 12; Armor Pad Build/SP1A.210812.016; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/116.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/431.0.0.30.108;]',
    expected: { vendor: 'Ulefone', model: 'Armor Pad', type: 'mobile' },
  },
  {
    desc: 'Ulefone Armor X5 Pro',
    ua: 'Mozilla/5.0 (Linux; Android 10; Armor X5 Pro Build/QP1A.190711.020; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/116.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/430.0.0.23.113;]',
    expected: { vendor: 'Ulefone', model: 'Armor X5 Pro', type: 'mobile' },
  },
  {
    desc: 'Ulefone Power Armor 14 Pro',
    ua: 'Mozilla/5.0 (Linux; Android 12; Power Armor14 Pro Build/SP1A.210812.016; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/115.0.5790.138 Mobile Safari/537.36',
    expected: { vendor: 'Ulefone', model: 'Power Armor14 Pro', type: 'mobile' },
  },
  {
    desc: 'Ulefone Power Armor 18T',
    ua: 'Mozilla/5.0 (Linux; Android 12; Power Armor 18T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Mobile Safari/537.36',
    expected: { vendor: 'Ulefone', model: 'Power Armor 18T', type: 'mobile' },
  },
  {
    desc: 'Ulefone Power Armor 19T',
    ua: 'Mozilla/5.0 (Linux; Android 12; Power Armor 19T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.5481.192 Mobile Safari/537.36 OPR/74.3.3922.71982',
    expected: { vendor: 'Ulefone', model: 'Power Armor 19T', type: 'mobile' },
  },
  {
    desc: 'MIUI Xiaomi Mi MIX 3 5G',
    ua: 'Dalvik/2.1.0 (Linux; U; Android 9; Mi MIX 3 5G MIUI/V10.3.2.0.PEMEUVF)',
    expected: { vendor: 'Xiaomi', model: 'Mi MIX 3 5G', type: 'mobile' },
  },
  {
    desc: 'MIUI POCOPHONE F1',
    ua: 'Dalvik/2.1.0 (Linux; U; Android 9; POCOPHONE F1 MIUI/9.6.27)',
    expected: { vendor: 'Xiaomi', model: 'POCOPHONE F1', type: 'mobile' },
  },
  {
    desc: 'MIUI Xiaomi M2006C3MT',
    ua: 'Dalvik/2.1.0 (Linux; U; Android 10; M2006C3MT MIUI/V12.0.7.0.QCRMIXM)',
    expected: { vendor: 'Xiaomi', model: 'M2006C3MT', type: 'mobile' },
  },
  {
    desc: 'Xiaomi 2201117TG',
    ua: 'Mozilla/5.0 (Linux; Android 11; 2201117TG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.98 Mobile Safari/537.36',
    expected: { vendor: 'Xiaomi', model: '2201117TG', type: 'mobile' },
  },
  {
    desc: 'Xiaomi M2004J19C',
    ua: 'Mozilla/5.0 (Linux; Android 11; M2004J19C Build/RP1A.200720.011; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/113.0.5672.77 Mobile Safari/537.36',
    expected: { vendor: 'Xiaomi', model: 'M2004J19C', type: 'mobile' },
  },
  {
    desc: 'Xiaomi M2006C3MNG',
    ua: 'Mozilla/5.0 (Linux; Android 11; M2006C3MNG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.85 Mobile Safari/537.36',
    expected: { vendor: 'Xiaomi', model: 'M2006C3MNG', type: 'mobile' },
  },
  {
    desc: 'Xiaomi 21061119DG',
    ua: 'Mozilla/5.0 (Linux; arm_64; Android 11; 21061119DG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 YaBrowser/23.3.7.24.00 SA/3 Mobile Safari/537.36',
    expected: { vendor: 'Xiaomi', model: '21061119DG', type: 'mobile' },
  },
  {
    desc: 'Xiaomi 2013023',
    ua: 'Mozilla/5.0 (Linux; U; Android 4.2.2; en-US; 2013023 Build/HM2013023) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 UCBrowser/10.0.1.512 U3/0.8.0 Mobile Safari/533.1',
    expected: { vendor: 'Xiaomi', model: '2013023', type: 'mobile' },
  },
  {
    desc: 'Xiaomi Hongmi Note 1W',
    ua: 'Mozilla/5.0 (Linux; U; Android 4.2.2; zh-CN; HM NOTE 1W Build/JDQ39) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 UCBrowser/9.7.9.439 U3/0.8.0 Mobile Safari/533.1',
    expected: { vendor: 'Xiaomi', model: 'HM NOTE 1W', type: 'mobile' },
  },
  {
    desc: 'Xiaomi Mi 3C',
    ua: 'Mozilla/5.0 (Linux; U; Android 4.3; zh-CN; MI 3C Build/JLS36C) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 UCBrowser/9.7.9.439 U3/0.8.0 Mobile Safari/533.1',
    expected: { vendor: 'Xiaomi', model: 'MI 3C', type: 'mobile' },
  },
  {
    desc: 'Xiaomi Mi 5',
    ua: 'Mozilla/5.0 (Linux; Android 7.0; MI 5 Build/NRD90M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.83 Mobile Safari/537.36',
    expected: { vendor: 'Xiaomi', model: 'MI 5', type: 'mobile' },
  },
  {
    desc: 'Xiaomi Mi 6',
    ua: 'Mozilla/5.0 (Linux; Android 7.1; MI 6 Build/NMF26X; xx-xx) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/59.0.3071.125 Mobile Safari/537.36',
    expected: { vendor: 'Xiaomi', model: 'MI 6', type: 'mobile' },
  },
  {
    desc: 'Xiaomi Mi 10 Pro',
    ua: 'Linux; U; Android 13; Mi 10 Pro Build/TKQ1.221114.001',
    expected: { vendor: 'Xiaomi', model: 'Mi 10 Pro', type: 'mobile' },
  },
  {
    desc: 'Xiaomi Mi 5s Plus',
    ua: 'Mozilla/5.0 (Linux; U; Android 6.0.1; zh-cn; MI 5s Plus Build/MXB48T) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/53.0.2785.146 Mobile Safari/537.36 XiaoMi/MiuiBrowser/8.7.1',
    expected: { vendor: 'Xiaomi', model: 'MI 5s Plus', type: 'mobile' },
  },
  {
    desc: 'Xiaomi Mi A1',
    ua: 'Mozilla/5.0 (Linux; Android 8.0.0; Mi A1 Build/OPR1.170623.026) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.111 Mobile Safari/537.36',
    expected: { vendor: 'Xiaomi', model: 'Mi A1', type: 'mobile' },
  },
  {
    desc: 'Xiaomi Mi Note',
    ua: 'Mozilla/5.0 (Linux; Android 4.4.4; MI NOTE LTE Build/KTU84P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.76 Mobile Safari/537.36',
    expected: { vendor: 'Xiaomi', model: 'MI NOTE LTE', type: 'mobile' },
  },
  {
    desc: 'Xiaomi Mi One Plus',
    ua: 'Mozilla/5.0 (Linux; U; Android 4.0.4; en-us; MI-ONE Plus Build/IMM76D) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
    expected: { vendor: 'Xiaomi', model: 'MI-ONE Plus', type: 'mobile' },
  },
  {
    desc: 'Xiaomi Mi Max 3',
    ua: 'Mozilla/5.0 (Linux; Android 9; MI MAX 3 Build/PKQ1.181007.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/79.0.3945.116 Mobile Safari/537.36',
    expected: { vendor: 'Xiaomi', model: 'MI MAX 3', type: 'mobile' },
  },
  {
    desc: 'Xiaomi Mi A1',
    ua: 'Mozilla/5.0 (Linux; Android 9; Mi A1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.101 Mobile Safari/537.36',
    expected: { vendor: 'Xiaomi', model: 'Mi A1', type: 'mobile' },
  },
  {
    desc: 'Xiaomi Mi A2 Lite',
    ua: 'Mozilla/5.0 (Linux; Android 9; Mi A2 Lite) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.62 Mobile Safari/537.36',
    expected: { vendor: 'Xiaomi', model: 'Mi A2 Lite', type: 'mobile' },
  },
  {
    desc: 'Xiaomi Mi 9 SE',
    ua: 'Mozilla/5.0 (Linux; Android 9; Mi 9 SE) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.136 Mobile Safari/537.36',
    expected: { vendor: 'Xiaomi', model: 'Mi 9 SE', type: 'mobile' },
  },
  {
    desc: 'Xiaomi Mi A2',
    ua: 'Mozilla/5.0 (Linux; Android 9; Mi A2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.132 Mobile Safari/537.36',
    expected: { vendor: 'Xiaomi', model: 'Mi A2', type: 'mobile' },
  },
  {
    desc: 'Xiaomi Mi CC9',
    ua: 'Mozilla/5.0 (Linux; U; Android 11; zh-cn; MI CC 9 Build/RKQ1.200826.002) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/89.0.4389.116 Mobile Safari/537.36 XiaoMi/MiuiBrowser/15.5.18',
    expected: { vendor: 'Xiaomi', model: 'MI CC 9', type: 'mobile' },
  },
  {
    desc: 'Xiaomi MI PAD',
    ua: 'Mozilla/5.0 (Linux; U; Android 4.4.4; en-us; MI PAD Build/KTU84P) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/53.0.2785.146 Mobile Safari/537.36 XiaoMi/MiuiBrowser/9.3.2',
    expected: { vendor: 'Xiaomi', model: 'MI PAD', type: 'tablet' },
  },
  {
    desc: 'Xiaomi MI PAD 2',
    ua: 'Mozilla/5.0 (Linux; Android 5.1; MI PAD 2 Build/LMY47I; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/60.0.3112.107 Safari/537.36 [FB_IAB/FB4A;FBAV/137.0.0.24.91;]',
    expected: { vendor: 'Xiaomi', model: 'MI PAD 2', type: 'tablet' },
  },
  {
    desc: 'Xiaomi MI PAD 2',
    ua: 'Mozilla/5.0 (Linux; x86_64; Android 5.1; MI PAD 2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 YaBrowser/20.11.2.69.01 Safari/537.36',
    expected: { vendor: 'Xiaomi', model: 'MI PAD 2', type: 'tablet' },
  },
  {
    desc: 'Xiaomi MI PAD 3',
    ua: 'Mozilla/5.0 (Linux; arm_64; Android 7.0; MI PAD 3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.216 YaBrowser/21.5.6.56.01 Safari/537.36',
    expected: { vendor: 'Xiaomi', model: 'MI PAD 3', type: 'tablet' },
  },
  {
    desc: 'Xiaomi MI PAD 4',
    ua: 'Mozilla/5.0 (Linux; arm_64; Android 8.1.0; MI PAD 4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.132 YaBrowser/19.9.1.126.01 Safari/537.36',
    expected: { vendor: 'Xiaomi', model: 'MI PAD 4', type: 'tablet' },
  },
  {
    desc: 'Xiaomi MI PAD 4 PLUS',
    ua: 'Mozilla/5.0 (Linux; Android 8.1; MI PAD 4 PLUS) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.132 Safari/537.36',
    expected: { vendor: 'Xiaomi', model: 'MI PAD 4 PLUS', type: 'tablet' },
  },
  {
    desc: 'Xiaomi MI PAD 4 WiFi',
    ua: 'Mozilla/5.0 (Linux; Android 8.1; Mi Pad4 Wi-Fi) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.111 Mobile Safari/537.36 EdgA/86.0.622.61',
    expected: { vendor: 'Xiaomi', model: 'Mi Pad4 Wi-Fi', type: 'tablet' },
  },
  {
    desc: 'Xiaomi Mi Pad 5',
    ua: 'Mozilla/5.0 (Linux; Android 13; 21051182G Build/TKQ1.221013.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.107 Safari/537.36 Flipboard/4.3.31/5486,4.3.31.5486',
    expected: { vendor: 'Xiaomi', model: '21051182G', type: 'tablet' },
  },
  {
    desc: 'Xiaomi Mi Pad 5 Pro',
    ua: 'Mozilla/5.0 (Linux; Android 11; M2105K81AC Build/RKQ1.200826.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/116.0.0.0 Safari/537.36 Line/13.15.1/IAB',
    expected: { vendor: 'Xiaomi', model: 'M2105K81AC', type: 'tablet' },
  },
  {
    desc: 'Xiaomi Mi Pad 5 Pro 5G',
    ua: 'Mozilla/5.0 (Linux; Android 12; M2105K81C) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36',
    expected: { vendor: 'Xiaomi', model: 'M2105K81C', type: 'tablet' },
  },
  {
    desc: 'Xiaomi Mi Pad 6 Max 14',
    ua: 'Mozilla/5.0 (Linux; U; Android 14; zh-tw; 2307BRPDCC Build/UKQ1.230804.001) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/109.0.5414.118 Mobile Safari/537.36 Device/yudi Model/2307BRPDCC XiaoMi/MiuiBrowser/14.10.6',
    expected: { vendor: 'Xiaomi', model: '2307BRPDCC', type: 'tablet' },
  },
  {
    desc: 'Xiaomi Mi Pad 6 Pro',
    ua: 'Mozilla/5.0 (Linux; U; Android 13; en-US; 23046RP50C Build/TKQ1.221114.001) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/78.0.3904.108 UCBrowser/13.6.2.1316 Mobile Safari/537.36',
    expected: { vendor: 'Xiaomi', model: '23046RP50C', type: 'tablet' },
  },
  {
    desc: 'Xiaomi Pad 6S Pro 12.4',
    ua: 'Mozilla/5.0 (Linux; Android 14; 24018RPACC) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
    expected: { vendor: 'Xiaomi', model: '24018RPACC', type: 'tablet' },
  },
  {
    desc: 'Xiaomi POCO X2',
    ua: 'Mozilla/5.0 (Linux; Android 10; POCO X2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.136 Mobile Safari/537.36',
    expected: { vendor: 'Xiaomi', model: 'POCO X2', type: 'mobile' },
  },
  {
    desc: 'Xiaomi POCO X3 Pro',
    ua: 'Mozilla/5.0 (Linux; Android 11; M2102J20SI) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    expected: { vendor: 'Xiaomi', model: 'M2102J20SI', type: 'mobile' },
  },
  {
    desc: 'Xiaomi POCO X3 Pro',
    ua: 'Mozilla/5.0 (Linux; Android 12; M2102J20SG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    expected: { vendor: 'Xiaomi', model: 'M2102J20SG', type: 'mobile' },
  },
  {
    desc: 'Xiaomi POCO X3 NFC',
    ua: 'Mozilla/5.0 (Linux; Android 12; M2007J20CG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Mobile Safari/537.36',
    expected: { vendor: 'Xiaomi', model: 'M2007J20CG', type: 'mobile' },
  },
  {
    desc: 'Xiaomi POCO M2 Pro',
    ua: 'Mozilla/5.0 (Linux; arm_64; Android 11; POCO M2 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 YaBrowser/22.11.7.42.00 SA/3 Mobile Safari/537.36',
    expected: { vendor: 'Xiaomi', model: 'POCO M2 Pro', type: 'mobile' },
  },
  {
    desc: 'Xiaomi POCO M3',
    ua: 'Mozilla/5.0 (Linux; Android 10; M2010J19CI) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Mobile Safari/537.36',
    expected: { vendor: 'Xiaomi', model: 'M2010J19CI', type: 'mobile' },
  },
  {
    desc: 'Xiaomi Redmi 4A',
    ua: 'Mozilla/5.0 (Linux; Android 6.0; Redmi 4A Build/MMB29M; xx-xx) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/56.0.2924.87 Mobile Safari/537.36',
    expected: { vendor: 'Xiaomi', model: 'Redmi 4A', type: 'mobile' },
  },
  {
    desc: 'Xiaomi Redmi 10C',
    ua: 'Mozilla/5.0 (Linux; Android 12; 220333QAG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Mobile Safari/537.36',
    expected: { vendor: 'Xiaomi', model: '220333QAG', type: 'mobile' },
  },
  {
    desc: 'Xiaomi Redmi K30 5G',
    ua: 'Mozilla/5.0 (Linux; Android 10; Redmi K30 5G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.96 Mobile Safari/537.36',
    expected: { vendor: 'Xiaomi', model: 'Redmi K30 5G', type: 'mobile' },
  },
  {
    desc: 'Xiaomi Redmi K30 Pro',
    ua: 'Mozilla/5.0 (Linux; Android 10; Redmi K30 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Mobile Safari/537.36',
    expected: { vendor: 'Xiaomi', model: 'Redmi K30 Pro', type: 'mobile' },
  },
  {
    desc: 'Xiaomi Redmi Note 3',
    ua: 'Mozilla/5.0 (Linux; Android 6.0.1; Redmi Note 3 Build/MMB29M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.116 Mobile Safari/537.36',
    expected: { vendor: 'Xiaomi', model: 'Redmi Note 3', type: 'mobile' },
  },
  {
    desc: 'Xiaomi Redmi Note 9 Pro Max',
    ua: 'Mozilla/5.0 (Linux; Android 10; Redmi Note 9 Pro Max) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.99 Mobile Safari/537.36',
    expected: { vendor: 'Xiaomi', model: 'Redmi Note 9 Pro Max', type: 'mobile' },
  },
  {
    desc: 'XiaoMi Redmi Note 9S',
    ua: 'Mozilla/5.0 (Linux; Android 10; Redmi Note 9S) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Mobile Safari/537.36',
    expected: { vendor: 'Xiaomi', model: 'Redmi Note 9S', type: 'mobile' },
  },
  {
    desc: 'XiaoMi Redmi Note 10 5G',
    ua: 'Mozilla/5.0 (Linux; Android 12; M2103K19C) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.88 Mobile Safari/537.36',
    expected: { vendor: 'Xiaomi', model: 'M2103K19C', type: 'mobile' },
  },
  {
    desc: 'XiaoMi Redmi Note 10 Pro',
    ua: 'Mozilla/5.0 (Linux; Android 13; M2101K6P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    expected: { vendor: 'Xiaomi', model: 'M2101K6P', type: 'mobile' },
  },
  {
    desc: 'XiaoMi Redmi Note 10 Pro',
    ua: 'Mozilla/5.0 (Linux; Android 12; M2101K6G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Mobile Safari/537.36',
    expected: { vendor: 'Xiaomi', model: 'M2101K6G', type: 'mobile' },
  },
  {
    desc: 'XiaoMi Redmi Note 8',
    ua: 'Mozilla/5.0 (Linux; Android 10; Redmi Note 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Mobile Safari/537.36',
    expected: { vendor: 'Xiaomi', model: 'Redmi Note 8', type: 'mobile' },
  },
  {
    desc: 'XiaoMi Redmi Note 12 Turbo',
    ua: 'Mozilla/5.0 (Linux; Android 13; 23049RAD8C; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/87.0.4280.141 Mobile Safari/537.36 VivoBrowser/16.7.1.1',
    expected: { vendor: 'Xiaomi', model: '23049RAD8C', type: 'mobile' },
  },
  {
    desc: 'XiaoMi Redmi Pad',
    ua: 'Mozilla/5.0 (Linux; U; Android 12; id-id; Redmi Pad Build/SP1A.210812.016) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/112.0.5615.136 Mobile Safari/537.36 XiaoMi/MiuiBrowser/14.1.1-gn',
    expected: { vendor: 'Xiaomi', model: 'Redmi Pad', type: 'tablet' },
  },
  {
    desc: 'XiaoMi Redmi Pad',
    ua: 'Mozilla/5.0 (Linux; Android 14; 22081283G Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.107 Safari/537.36 Flipboard/4.3.31/5486,4.3.31.5486',
    expected: { vendor: 'Xiaomi', model: '22081283G', type: 'tablet' },
  },
  {
    desc: 'XiaoMi Redmi Pad Pro',
    ua: 'Mozilla/5.0 (Linux; Android 14; 2405CRPFDG Build/UKQ1.240116.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/127.0.6533.97 Safari/537.36 [FB_IAB/FB4A;FBAV/476.0.0.49.74;] FBNV/1',
    expected: { vendor: 'Xiaomi', model: '2405CRPFDG', type: 'tablet' },
  },
  {
    desc: 'XiaoMi Redmi Pad SE',
    ua: 'Dalvik/2.1.0 (Linux; U; Android 14; 23073RPBFG Build/UKQ1.231003.002)',
    expected: { vendor: 'Xiaomi', model: '23073RPBFG', type: 'tablet' },
  },
  {
    desc: 'XiaoMi Redmi Pad SE 8.7',
    ua: 'Mozilla/5.0 (Linux; Android 14; 24076RP19G Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.107 Mobile Safari/537.36 Line/14.18.1/IAB',
    expected: { vendor: 'Xiaomi', model: '24076RP19G', type: 'tablet' },
  },
  {
    desc: 'ZTE Blade A6',
    ua: 'Mozilla/5.0 (Linux; Android 7.1.1; ZTE BLADE A0620 Build/NMF26F; ru-ru) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.136 Mobile Safari/537.36 Puffin/9.2.0.50586AP',
    expected: { vendor: 'ZTE', model: 'BLADE A0620', type: 'mobile' },
  },
  {
    desc: 'PlayStation 4',
    ua: 'Mozilla/5.0 (PlayStation 4 3.00) AppleWebKit/537.73 (KHTML, like Gecko)',
    expected: { vendor: 'Sony', model: 'PlayStation 4', type: 'console' },
  },
  {
    desc: 'PlayStation 5',
    ua: 'Mozilla/5.0 (Playstation; Playstation 5/1.05) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0 Safari/605.1.15',
    expected: { vendor: 'Sony', model: 'Playstation 5', type: 'console' },
  },
  {
    desc: 'PlayStation Vita',
    ua: 'Mozilla/5.0 (PlayStation Vita 3.52) AppleWebKit/537.73 (KHTML, like Gecko) Silk/3.2',
    expected: { vendor: 'Sony', model: 'PlayStation Vita', type: 'console' },
  },
  {
    desc: 'Nintendo Switch',
    ua: 'Mozilla/5.0 (Nintendo Switch; WifiWebAuthApplet) AppleWebKit/606.4 (KHTML, like Gecko) NF/6.0.1.15.4 NintendoBrowser/5.1.0.20393',
    expected: { vendor: 'Nintendo', model: 'Switch', type: 'console' },
  },
  {
    desc: 'Nintendo WiiU',
    ua: 'Mozilla/5.0 (Nintendo WiiU) AppleWebKit/536.30 (KHTML, like Gecko) NX/3.0.4.2.9 NintendoBrowser/4.2.0.11146.EU',
    expected: { vendor: 'Nintendo', model: 'WiiU', type: 'console' },
  },
  {
    desc: 'Nintendo Wii',
    ua: 'Opera/9.10 (Nintendo Wii; U; ; 1621; en)',
    expected: { vendor: 'Nintendo', model: 'Wii', type: 'console' },
  },
  {
    desc: 'Nintendo 3DS',
    ua: 'Mozilla/5.0 (Nintendo 3DS; U; ; en) Version/1.7610.EU',
    expected: { vendor: 'Nintendo', model: '3DS', type: 'console' },
  },
  {
    desc: 'Nintendo 3DS',
    ua: 'Mozilla/5.0 (New Nintendo 3DS like iPhone) AppleWebKit/536.30 (KHTML, like Gecko) NX/3.0.0.5.15 Mobile NintendoBrowser/1.3.10126.EU',
    expected: { vendor: 'Nintendo', model: '3DS', type: 'console' },
  },
  {
    desc: 'Galaxy Nexus',
    ua: 'Mozilla/5.0 (Linux; Android 4.0.4; Galaxy Nexus Build/IMM76B) AppleWebKit/535.19 (KHTML, like Gecko) Chrome/18.0.1025.133 Mobile Safari/535.19',
    expected: { vendor: 'Samsung', model: 'Galaxy Nexus', type: 'mobile' },
  },
  {
    desc: 'Samsung Galaxy C9 Pro',
    ua: 'Mozilla/5.0 (Linux; Android 6.0; SAMSUNG SM-C900F Build/MMB29M) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/4.2 Chrome/44.0.2403.133 Mobile Safari/537.36',
    expected: { vendor: 'Samsung', model: 'SM-C900F', type: 'mobile' },
  },
  {
    desc: 'Samsung Galaxy S5',
    ua: 'Mozilla/5.0 (Linux; Android 5.0; SM-G900F Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.78 Mobile Safari/537.36',
    expected: { vendor: 'Samsung', model: 'SM-G900F', type: 'mobile' },
  },
  {
    desc: 'Samsung Galaxy J7 Prime',
    ua: 'Mozilla/5.0 (Linux; Android 8.1.0; SM-G610F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    expected: { vendor: 'Samsung', model: 'SM-G610F', type: 'mobile' },
  },
  {
    desc: 'Samsung Galaxy S6',
    ua: 'Mozilla/5.0 (Linux; Android 4.4.2; SM-G920I Build/KOT49H) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/36.0.1985.135 Safari/537.36',
    expected: { vendor: 'Samsung', model: 'SM-G920I', type: 'mobile' },
  },
  {
    desc: 'Samsung Galaxy S6 Edge',
    ua: 'Mozilla/5.0 (Linux; Android 4.4.2; SM-G925I Build/KOT49H) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/36.0.1985.135 Safari/537.36',
    expected: { vendor: 'Samsung', model: 'SM-G925I', type: 'mobile' },
  },
  {
    desc: 'Samsung Galaxy Note 5 Chrome',
    ua: 'Mozilla/5.0 (Linux; Android 5.1.1; SM-N920C Build/LMY47X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.91 Mobile Safari/537.36',
    expected: { vendor: 'Samsung', model: 'SM-N920C', type: 'mobile' },
  },
  {
    desc: 'Samsung Galaxy Note 5 Samsung Browser',
    ua: 'Mozilla/5.0 (Linux; Android 5.1.1; SAMSUNG SM-N920C Build/LMY47X) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/4.0 Chrome/44.0.2403.133 Mobile Safari/537.36',
    expected: { vendor: 'Samsung', model: 'SM-N920C', type: 'mobile' },
  },
  {
    desc: 'Google Chromecast',
    ua: 'Mozilla/5.0 (X11; Linux armv7l) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.84 Safari/537.36 CrKey/1.22.79313',
    expected: { vendor: 'Google', model: 'Chromecast', type: 'smarttv' },
  },
  {
    desc: 'Google Pixel C',
    ua: 'Mozilla/5.0 (Linux; Android 7.0; Pixel C Build/NRD90M; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/52.0.2743.98 Safari/537.36',
    expected: { vendor: 'Google', model: 'Pixel C', type: 'tablet' },
  },
  {
    desc: 'Google Pixel C',
    ua: 'Mozilla/5.0 (Linux; Android 8.0.0; Pixel C) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.64 Safari/537.36',
    expected: { vendor: 'Google', model: 'Pixel C', type: 'tablet' },
  },
  {
    desc: 'Google Pixel',
    ua: 'Mozilla/5.0 (Linux; Android 7.1; Pixel Build/NDE63V) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.85 Mobile Safari/537.36',
    expected: { vendor: 'Google', model: 'Pixel', type: 'mobile' },
  },
  {
    desc: 'Google Pixel Tablet',
    ua: 'Mozilla/5.0 (Linux; Android 14; Pixel Tablet Build/AP2A.240905.003; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.107 Safari/537.36',
    expected: { vendor: 'Google', model: 'Pixel Tablet', type: 'tablet' },
  },
  {
    desc: 'Google Pixel Watch',
    ua: 'Dalvik/2.1.0 (Linux; U; Android 13; Google Pixel Watch Build/TWD4.231005.002)',
    expected: { vendor: 'Google', model: 'Pixel Watch', type: 'wearable' },
  },
  {
    desc: 'Google Pixel Watch 2',
    ua: 'Dalvik/2.1.0 (Linux; U; Android 13; Google Pixel Watch 2 Build/TWD9.240605.001.A1)',
    expected: { vendor: 'Google', model: 'Pixel Watch 2', type: 'wearable' },
  },
  {
    desc: 'Google Pixel XL',
    ua: 'Mozilla/5.0 (Linux; Android 7.1; Pixel XL Build/NDE63X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.85 Mobile Safari/537.36',
    expected: { vendor: 'Google', model: 'Pixel XL', type: 'mobile' },
  },
  {
    desc: 'Google Pixel XL',
    ua: 'Mozilla/5.0 (Linux; Android 9; Pixel XL) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.110 Mobile Safari/537.36',
    expected: { vendor: 'Google', model: 'Pixel XL', type: 'mobile' },
  },
  {
    desc: 'Google Pixel 2',
    ua: 'Mozilla/5.0 (Linux; Android 8.1.0; Pixel 2 Build/OPM1.171019.013) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.111 Safari/537.36',
    expected: { vendor: 'Google', model: 'Pixel 2', type: 'mobile' },
  },
  {
    desc: 'Google Pixel 2 XL',
    ua: 'Mozilla/5.0 (Linux; Android 8.1.0; Pixel 2 XL Build/OPM1.171019.013) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.111 Safari/537.36',
    expected: { vendor: 'Google', model: 'Pixel 2 XL', type: 'mobile' },
  },
  {
    desc: 'Google Pixel 2 XL',
    ua: 'Mozilla/5.0 (Linux; Android 9; Pixel 2 XL) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.110 Mobile Safari/537.36',
    expected: { vendor: 'Google', model: 'Pixel 2 XL', type: 'mobile' },
  },
  {
    desc: 'Google Pixel 3',
    ua: 'Mozilla/5.0 (Linux; Android 9; Pixel 3 Build/PD1A.180720.030) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Mobile Safari/537.36',
    expected: { vendor: 'Google', model: 'Pixel 3', type: 'mobile' },
  },
  {
    desc: 'Google Pixel 3 XL',
    ua: 'Mozilla/5.0 (Linux; Android 9; Pixel 3 XL Build/PD1A.180720.030) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Mobile Safari/537.36',
    expected: { vendor: 'Google', model: 'Pixel 3 XL', type: 'mobile' },
  },
  {
    desc: 'Google Pixel 3 XL',
    ua: 'Mozilla/5.0 (Linux; Android 9; Pixel 3 XL) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.110 Mobile Safari/537.36',
    expected: { vendor: 'Google', model: 'Pixel 3 XL', type: 'mobile' },
  },
  {
    desc: 'Google Pixel 3a',
    ua: 'Mozilla/5.0 (Linux; Android 10; Pixel 3a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Mobile Safari/537.36',
    expected: { vendor: 'Google', model: 'Pixel 3a', type: 'mobile' },
  },
  {
    desc: 'Google Pixel 3a XL',
    ua: 'Mozilla/5.0 (Linux; Android 10; Pixel 3a XL) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Mobile Safari/537.36',
    expected: { vendor: 'Google', model: 'Pixel 3a XL', type: 'mobile' },
  },
  {
    desc: 'Google Pixel 4',
    ua: 'Mozilla/5.0 (Linux; Android 10; Pixel 4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Mobile Safari/537.36',
    expected: { vendor: 'Google', model: 'Pixel 4', type: 'mobile' },
  },
  {
    desc: 'Google Pixel 4a',
    ua: 'Mozilla/5.0 (Linux; Android 10; Pixel 4a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.83 Mobile Safari/537.36',
    expected: { vendor: 'Google', model: 'Pixel 4a', type: 'mobile' },
  },
  {
    desc: 'Google Pixel 4 XL',
    ua: 'Mozilla/5.0 (Linux; Android 10; Pixel 4 XL) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Mobile Safari/537.36',
    expected: { vendor: 'Google', model: 'Pixel 4 XL', type: 'mobile' },
  },
  {
    desc: 'Google Pixel 5',
    ua: 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.120 Mobile Safari/537.36',
    expected: { vendor: 'Google', model: 'Pixel 5', type: 'mobile' },
  },
  {
    desc: 'Generic Android Device',
    ua: 'Mozilla/5.0 (Linux; U; Android 6.0.1; i980 Build/MRA58K)',
    expected: { vendor: 'Generic', model: 'i980' },
  },
  {
    desc: 'Generic Android Device',
    ua: 'Dalvik/2.1.0 (Linux; U; Android 9; X96mini_RP Build/X96mini_RP)',
    expected: { vendor: 'Generic', model: 'X96mini_RP' },
  },
  {
    desc: 'Android Phone Unidentified Vendor (docomo F-04K)',
    ua: 'Mozilla/5.0 (Linux; Android 8.1.0; F-04K Build/V15R060P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.137 Mobile Safari/537.36',
    expected: { model: 'F-04K', type: 'mobile' },
  },
  {
    desc: 'docomo SH-02M',
    ua: 'Mozilla/5.0 (Linux; Android 9; SH-02M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.136 Mobile Safari/537.36',
    expected: { vendor: 'Sharp', model: 'SH-02M', type: 'mobile' },
  },
  {
    desc: 'Android Tablet Unidentified Vendor (docomo F-02K)',
    ua: 'Mozilla/5.0 (Linux; Android 8.1.0; F-02K Build/V44R059G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.109 Safari/537.36',
    expected: { model: 'F-02K', type: 'tablet' },
  },
  {
    desc: 'Android Tablet Unidentified Vendor (docomo d-02K)',
    ua: 'Mozilla/5.0 (Linux; Android 9; d-02K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.136 Safari/537.36',
    expected: { model: 'd-02K', type: 'tablet' },
  },
  {
    desc: 'LG VK Series Tablet',
    ua: 'Mozilla/5.0 (Linux; Android 5.0.2; VK700 Build/LRX22G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.84 Safari/537.36',
    expected: { vendor: 'LG', model: 'VK700', type: 'tablet' },
  },
  {
    desc: 'LG LK Series Tablet',
    ua: 'Mozilla/5.0 (Linux; Android 5.0.1; LGLK430 Build/LRX21Y) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/38.0.2125.102 Safari/537.36',
    expected: { vendor: 'LG', model: 'LK430', type: 'tablet' },
  },
  {
    desc: 'RCA Voyager III Tablet',
    ua: 'Mozilla/5.0 (Linux; Android 6.0.1; RCT6973W43 Build/MMB29M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36',
    expected: { vendor: 'RCA', model: 'RCT6973W43', type: 'tablet' },
  },
  {
    desc: 'RCA Voyager II Tablet',
    ua: 'Mozilla/5.0 (Linux; Android 5.0; RCT6773W22B Build/LRX21M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36',
    expected: { vendor: 'RCA', model: 'RCT6773W22B', type: 'tablet' },
  },
  {
    desc: 'Verizon Quanta Tablet',
    ua: 'Mozilla/5.0 (Linux; Android 4.4.2; QMV7B Build/KOT49H) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36',
    expected: { vendor: 'Verizon', model: 'QMV7B', type: 'tablet' },
  },
  {
    desc: 'Verizon Ellipsis 8 Tablet',
    ua: 'Mozilla/5.0 (Linux; Android 5.1.1; QTAQZ3 Build/LMY47V) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36',
    expected: { vendor: 'Verizon', model: 'QTAQZ3', type: 'tablet' },
  },
  {
    desc: 'Verizon Ellipsis 8HD Tablet',
    ua: 'Mozilla/5.0 (Linux; Android 6.0.1; QTASUN1 Build/MMB29M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.81 Safari/537.36',
    expected: { vendor: 'Verizon', model: 'QTASUN1', type: 'tablet' },
  },
  {
    desc: 'Dell Venue 8 Tablet',
    ua: 'Mozilla/5.0 (Linux; Android 4.4.2; Venue 8 3830 Build/KOT49H) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36',
    expected: { vendor: 'Dell', model: 'Venue 8 3830', type: 'tablet' },
  },
  {
    desc: 'Dell Venue 7 Tablet',
    ua: 'Mozilla/5.0 (Linux; Android 4.4.2; Venue 7 3730 Build/KOT49H) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36',
    expected: { vendor: 'Dell', model: 'Venue 7 3730', type: 'tablet' },
  },
  {
    desc: 'Barnes & Noble Nook HD+ Tablet',
    ua: 'Mozilla/5.0 (Linux; U; Android 4.1.2; en-us; Barnes & Noble Nook HD+ Build/JZO54K; CyanogenMod-10) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
    expected: { vendor: 'Barnes & Noble', model: 'Nook HD+', type: 'tablet' },
  },
  {
    desc: 'Barnes & Noble V400 Tablet',
    ua: 'Mozilla/5.0 (Linux; Android 4.0.4; BNTV400 Build/IMM76L) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.111 Safari/537.36',
    expected: { vendor: 'Barnes & Noble', model: 'V400', type: 'tablet' },
  },
  {
    desc: 'NuVision TM101A540N Tablet',
    ua: 'Mozilla/5.0 (Linux; Android 5.1; TM101A540N Build/LMY47I; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/50.0.2661.86 Safari/537.36',
    expected: { vendor: 'NuVision', model: 'TM101A540N', type: 'tablet' },
  },
  {
    desc: 'ZTE-Z431',
    ua: 'ZTE-Z431/1.4.0 NetFront/4.2 QTV5.1 Profile/MIDP-2.1 Configuration/CLDC-1.1',
    expected: { vendor: 'ZTE', model: 'Z431', type: 'mobile' },
  },
  {
    desc: 'ZTE',
    ua: 'Mozilla/5.0 (Linux; U; Android 4.1.2; en-us; ZTE-Z740G Build/JZO54K) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
    expected: { vendor: 'ZTE', model: 'Z740G', type: 'mobile' },
  },
  {
    desc: 'ZTE K Series Tablet',
    ua: 'Mozilla/5.0 (Linux; Android 6.0.1; K88 Build/MMB29M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36',
    expected: { vendor: 'ZTE', model: 'K88', type: 'tablet' },
  },
  {
    desc: 'ZTE Nubia Red Magic 3',
    ua: 'Mozilla/5.0 (Linux; Android 9; NX629J Build/PKQ1.190321.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/66.0.3359.126 MQQBrowser/6.2 TBS/45016 Mobile Safari/537.36 MMWEBID/4064 MicroMessenger/7.0.10.1580(0x27000A34) Process/tools NetType/WIFI Language/zh_CN ABI/arm64',
    expected: { vendor: 'ZTE', model: 'NX629J', type: 'mobile' },
  },
  {
    desc: 'ZTE Blade A5',
    ua: 'Mozilla/5.0 (Linux; Android 9; ZTE Blade A5 2019) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.116 Mobile Safari/537.36',
    expected: { vendor: 'ZTE', model: 'Blade A5 2019', type: 'mobile' },
  },
  {
    desc: 'ZTE BLADE V0730',
    ua: 'Mozilla/5.0 (Linux; Android 6.0; ZTE BLADE V0730) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.116 Mobile Safari/537.36',
    expected: { vendor: 'ZTE', model: 'BLADE V0730', type: 'mobile' },
  },
  {
    desc: 'ZTE B2017G',
    ua: 'Mozilla/5.0 (Linux; Android 7.1.1; ZTE B2017G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.93 Mobile Safari/537.36',
    expected: { vendor: 'ZTE', model: 'B2017G', type: 'mobile' },
  },
  {
    desc: 'Swizz GEN610',
    ua: 'Mozilla/5.0 (Linux; Android 4.4.2; GEN610 Build/KOT49H) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.83 Mobile Safari/537.36',
    expected: { vendor: 'Swiss', model: 'GEN610', type: 'mobile' },
  },
  {
    desc: 'Swizz ZUR700',
    ua: 'Mozilla/5.0 (Linux; Android 4.4.2; ZUR700 Build/KVT49L) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2272.96 Safari/537.36',
    expected: { vendor: 'Swiss', model: 'ZUR700', type: 'tablet' },
  },
  {
    desc: 'Zeki TB782b Tablet',
    ua: 'Mozilla/5.0 (Linux; U; Android 4.0.4; en-US; TB782B Build/IMM76D) AppleWebKit/534.31 (KHTML, like Gecko) UCBrowser/9.0.2.299 U3/0.8.0 Mobile Safari/534.31',
    expected: { vendor: 'Zeki', model: 'TB782B', type: 'tablet' },
  },
  {
    desc: 'Dragon Touch Tablet',
    ua: 'Mozilla/5.0 (Linux; Android 4.0.4; DT9138B Build/IMM76D) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.72 Mobile Safari/537.36',
    expected: { vendor: 'Dragon Touch', model: '9138B', type: 'tablet' },
  },
  {
    desc: 'Insignia Tablet',
    ua: 'Mozilla/5.0 (Linux; U; Android 6.0.1; NS-P08A7100 Build/MMB29M; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/56.0.2924.87 Safari/537.36',
    expected: { vendor: 'Insignia', model: 'NS-P08A7100', type: 'tablet' },
  },
  {
    desc: 'Voice Xtreme V75',
    ua: 'Mozilla/5.0 (Linux; U; Android 4.2.1; en-us; V75 Build/JOP40D) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
    expected: { vendor: 'Voice', model: 'V75', type: 'mobile' },
  },
  {
    desc: 'LvTel V11',
    ua: 'Mozilla/5.0 (Linux; Android 5.1.1; V11 Build/LMY47V) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/39.0.0.0 Safari/537.36',
    expected: { vendor: 'LvTel', model: 'V11', type: 'mobile' },
  },
  {
    desc: 'Envizen Tablet V100MD',
    ua: 'Mozilla/5.0 (Linux; U; Android 4.1.1; en-us; V100MD Build/V100MD.20130816) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Safari/534.30',
    expected: { vendor: 'Envizen', model: 'V100MD', type: 'tablet' },
  },
  {
    desc: 'Rotor Tablet',
    ua: 'mozilla/5.0 (linux; android 5.0.1; tu_1491 build/lrx22c) applewebkit/537.36 (khtml, like gecko) chrome/43.0.2357.93 safari/537.36',
    expected: { vendor: 'Rotor', model: '1491', type: 'tablet' },
  },
  {
    desc: 'MachSpeed Tablets',
    ua: 'Mozilla/5.0 (Linux; Android 4.4.2; Trio 7.85 vQ Build/Trio_7.85_vQ) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/30.0.0.0 Safari/537.36',
    expected: { vendor: 'MachSpeed', model: 'Trio 7.85 vQ', type: 'tablet' },
  },
  {
    desc: 'Trinity Tablets',
    ua: 'Mozilla/5.0 (Linux; Android 5.0.1; Trinity T101 Build/LRX22C) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.83 Safari/537.36',
    expected: { vendor: 'Trinity', model: 'T101', type: 'tablet' },
  },
  {
    desc: 'NextBook Next7',
    ua: 'Mozilla/5.0 (Linux; U; Android 4.0.4; en-us; Next7P12 Build/IMM76I) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Safari/534.30',
    expected: { vendor: 'NextBook', model: 'Next7P12', type: 'tablet' },
  },
  {
    desc: 'NextBook Tablets',
    ua: 'Mozilla/5.0 (Linux; Android 5.0; NXA8QC116 Build/LRX21V) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36',
    expected: { vendor: 'NextBook', model: 'NXA8QC116', type: 'tablet' },
  },
  {
    desc: 'Le Pan Tablets',
    ua: 'Mozilla/5.0 (Linux; Android 4.2.2; Le Pan TC802A Build/JDQ39) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36',
    expected: { vendor: 'Le Pan', model: 'TC802A', type: 'tablet' },
  },
  {
    desc: 'Le Pan Tablets',
    ua: 'Mozilla/5.0 (Linux; Android 4.2.2; Le Pan TC802A Build/JDQ39) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36',
    expected: { vendor: 'Le Pan', model: 'TC802A', type: 'tablet' },
  },
  {
    desc: 'Amazon Alexa Echo Show',
    ua: 'AlexaWebMediaPlayer/1.0.200641.0 (Linux;Android 5.1.1)',
    expected: { vendor: 'Amazon', model: 'Alexa', type: 'tablet' },
  },
  {
    desc: 'Amazon Kindle Fire Tablet',
    ua: 'Mozilla/5.0 (Linux; U; Android 4.4.3; en-us; KFSAWI Build/KTU84M) AppleWebKit/537.36 (KHTML, like Gecko) Silk/3.66 like Chrome/39.0.2171.93 Safari/537.36',
    expected: { vendor: 'Amazon', model: 'KFSAWI', type: 'tablet' },
  },
  {
    desc: 'Amazon Kindle Fire Tablet',
    ua: 'Mozilla/5.0 (Linux; U; Android 4.4.3; en-us; KFSAWI) AppleWebKit/537.36 (KHTML, like Gecko) Silk/3.66 like Chrome/39.0.2171.93 Safari/537.36',
    expected: { vendor: 'Amazon', model: 'KFSAWI', type: 'tablet' },
  },
  {
    desc: 'Amazon Kindle Fire Tablet',
    ua: 'Mozilla/5.0 (Linux; Android 9; KFMAWI Build/PS7312; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/70.0.3538.110 Safari/537.36',
    expected: { vendor: 'Amazon', model: 'KFMAWI', type: 'tablet' },
  },
  {
    desc: 'Amazon Fire TV',
    ua: 'Mozilla/5.0 (Linux; Android 4.2.2; AFTB Build/JDQ39) AppleWebKit/537.22 (KHTML, like Gecko) Chrome/25.0.1364.173 Mobile Safari/537.22',
    expected: { vendor: 'Amazon', model: 'B', type: 'smarttv' },
  },
  {
    desc: 'Amazon Fire TV',
    ua: 'Mozilla/5.0 (Linux; Android 5.1.1; AFTT) AppleWebKit/537.36 (KHTML, like Gecko) Silk/86.3.20 like Chrome/86.0.4240.198 Safari/537.36',
    expected: { vendor: 'Amazon', model: 'T', type: 'smarttv' },
  },
  {
    desc: 'Amazon Fire TV',
    ua: 'Mozilla/5.0 (Linux; Android 9; AFTKA Build/PS7633.3445N; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/108.0.5359.160 Mobile Safari/537.36',
    expected: { vendor: 'Amazon', model: 'KA', type: 'smarttv' },
  },
  {
    desc: 'Android TV',
    ua: 'Mozilla/5.0 (Linux; Android 10; 2020/2021 UHD Android TV Build/QTG3.201102.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) version/4.0 Chrome/83.0.4103.101 Mobile Safari/537.36',
    expected: { type: 'smarttv' },
  },
  {
    desc: 'Gigaset Tablet',
    ua: 'Mozilla/5.0 (Linux; Android 4.2.2; Gigaset QV830 Build/JDQ39) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36',
    expected: { vendor: 'Gigaset', model: 'QV830', type: 'tablet' },
  },
  {
    desc: 'Amazon Fire 7',
    ua: 'Mozilla/5.0 (Linux; Android 5.1.1; KFAUWI) AppleWebKit/537.36 (KHTML, like Gecko) Silk/80.5.3 like Chrome/80.0.3987.162 Safari/537.36',
    expected: { vendor: 'Amazon', model: 'KFAUWI', type: 'tablet' },
  },
  {
    desc: 'AT&T Radiant Core U304AA',
    ua: 'Dalvik/2.1.0 (Linux; U; Android 9; U304AA Build/P00610)',
    expected: { vendor: 'AT&T', model: 'U304AA', type: 'mobile' },
  },
  {
    desc: 'Vodafone Smart Tab 4G',
    ua: 'Mozilla/5.0 (Linux; Android 4.4.4; Vodafone Smart Tab 4G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Safari/537.36',
    expected: { vendor: 'Vodafone', model: 'Smart Tab 4G', type: 'tablet' },
  },
  {
    desc: 'Vodafone Smart ultra 6',
    ua: 'Mozilla/5.0 (Linux; Android 5.0.2; Vodafone Smart ultra 6 Build/LRX22G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.133 Mobile Safari/537.36',
    expected: { vendor: 'Vodafone', model: 'Smart ultra 6', type: 'tablet' },
  },
  {
    desc: '4ife 4K Smart TV Box',
    ua: 'Mozilla/5.0 (Linux; Android 4.4.2; 4ife 4K Smart TV Box Build/KOT49H) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/30.0.0.0 Safari/537.36 Vinebre',
    expected: { model: '4ife 4K', type: 'smarttv' },
  },
  {
    desc: 'FaceBook Mobile App',
    ua: '[FBAN/FBIOS;FBAV/283.0.0.44.117;FBBV/238386386;FBDV/iPhone12,1;FBMD/iPhone;FBSN/iOS;FBSV/13.6.1;FBSS/2;FBID/phone;FBLC/en_US;FBOP/5;FBRV/240127608]',
    expected: { vendor: 'Apple', model: 'iPhone12,1', type: 'mobile' },
  },
  {
    desc: 'Issue #519',
    ua: 'ios/iPhone/14.2/SOME_CUSTOM_APP_VERSION',
    expected: { vendor: 'Apple', model: 'iPhone', type: 'mobile' },
  },
  {
    desc: 'Issue #454',
    ua: 'Mosamzilla/5.0 (Windows; U; Win98; en-US; rv:1.7.5) Gecko/20050603 Netscape/8.0.2',
    expected: {},
  },
  {
    desc: 'Alcatel',
    ua: 'Mozilla/5.0 (Linux; Android 4.4.2; ALCATEL A564C Build/KVT49L) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.133 Mobile Safari/537.36',
    expected: { vendor: 'ALCATEL', model: 'A564C', type: 'mobile' },
  },
  {
    desc: 'Alcatel Go Flip',
    ua: 'Mozilla/5.0 (Mobile; ALCATEL4044T; rv:37.0) Gecko/37.0 Firefox/37.0 KaiOS/1.0',
    expected: { vendor: 'ALCATEL', model: '4044T', type: 'mobile' },
  },
  {
    desc: 'Jolla',
    ua: 'Mozilla/5.0 (Maemo; Linux; U; Jolla; Sailfish; Mobile; rv:31.0) Gecko/31.0 Firefox/31.0 SailfishBrowser/1.0',
    expected: { vendor: 'Jolla', type: 'mobile' },
  },
  {
    desc: 'Xbox One',
    ua: 'Mozilla/5.0 (compatible; MSIE 10.0; Windows Phone 8.0; Trident/6.0; IEMobile/10.0; Xbox; Xbox One)',
    expected: { vendor: 'Microsoft', model: 'Xbox One', type: 'console' },
  },
  {
    desc: 'Xbox',
    ua: 'Mozilla/5.0 (compatible; MSIE 9.0; Windows Phone OS 7.5; Trident/5.0; IEMobile/9.0; Xbox)',
    expected: { vendor: 'Microsoft', model: 'Xbox', type: 'console' },
  },
  {
    desc: 'Tegra Note 7',
    ua: 'Mozilla/5.0 (Linux; Android 5.1; TegraNote-P1640 Build/LMY47D) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.133 Safari/537.36',
    expected: { vendor: 'Nvidia', model: 'TegraNote-P1640', type: 'tablet' },
  },
  {
    desc: 'Nvidia Shield',
    ua: 'Mozilla/5.0 (Linux; Android 5.1; SHIELD) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.74 Mobile Safari/537.36',
    expected: { vendor: 'Nvidia', model: 'SHIELD', type: 'console' },
  },
  {
    desc: 'Nvidia Shield Tablet',
    ua: 'Mozilla/5.0 (Linux; Android 5.1.1; SHIELD Tablet Build/LVY48E; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/45.0.2454.19 Safari/537.36',
    expected: { vendor: 'Nvidia', model: 'SHIELD Tablet', type: 'tablet' },
  },
  {
    desc: 'Nvidia Shield Tablet K1',
    ua: 'Mozilla/5.0 (Linux; Android 7.0; SHIELD Tablet K1 Build/NRD90M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.98 Safari/537.36',
    expected: { vendor: 'Nvidia', model: 'SHIELD Tablet K1', type: 'tablet' },
  },
  {
    desc: 'Nvidia Shield TV',
    ua: 'Mozilla/5.0 (Linux; Android 11; SHIELD Android TV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36  ',
    expected: { vendor: 'Nvidia', model: 'SHIELD Android TV', type: 'smarttv' },
  },
  {
    desc: 'Ouya',
    ua: 'Mozilla/5.0 (Linux; Android 4.1.2; OUYA Console Build/JZO54L-OUYA) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.84 Safari/537.36',
    expected: { vendor: 'OUYA', type: 'console' },
  },
  {
    desc: 'Vivo Y52s',
    ua: 'Mozilla/5.0 (Linux; Android 10; V2057A Build/QP1A.190711.020; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/76.0.3809.89 Mobile Safari/537.36 T7/12.10 SP-engine/2.28.0 baiduboxapp/12.10.0.10 (Baidu; P1 10) NABar/1.0',
    expected: { vendor: 'Vivo', model: 'V2057A', type: 'mobile' },
  },
  {
    desc: 'Vivo X60',
    ua: 'Mozilla/5.0 (Linux; Android 11; V2046A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.84 Mobile Safari/537.36 VivoBrowser/8.8.71.0',
    expected: { vendor: 'Vivo', model: 'V2046A', type: 'mobile' },
  },
  {
    desc: 'Vivo Y79A',
    ua: 'Mozilla/5.0 (Linux; Android 7.1.2; vivo Y79A Build/N2G47H; wv) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.84 Mobile Safari/537.36 VivoBrowser/9.0.14.0',
    expected: { vendor: 'Vivo', model: 'Y79A', type: 'mobile' },
  },
  {
    desc: 'Vivo Y93',
    ua: 'Mozilla/5.0 (Linux; Android 8.1.0; vivo 1814) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
    expected: { vendor: 'Vivo', model: '1814', type: 'mobile' },
  },
  {
    desc: 'Vivo Y97',
    ua: 'Mozilla/5.0 (Linux; Android 8.1.0; V1813T Build/O11019; wv) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.84 Mobile Safari/537.36 VivoBrowser/9.0.14.0',
    expected: { vendor: 'Vivo', model: 'V1813T', type: 'mobile' },
  },
  {
    desc: 'Vivo iQOO Pro',
    ua: 'Mozilla/5.0 (Linux; Android 11; V1916A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.84 Mobile Safari/537.36 VivoBrowser/9.1.10.6',
    expected: { vendor: 'Vivo', model: 'V1916A', type: 'mobile' },
  },
  {
    desc: 'Vivo 1906 (Y11)',
    ua: 'Mozilla/5.0 (Linux; Android 11; vivo 1906) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Mobile Safari/537.36',
    expected: { vendor: 'Vivo', model: '1906', type: 'mobile' },
  },
  {
    desc: 'Unknown Mobile using Firefox',
    ua: 'Mozilla/5.0 (Android 4.4; Mobile; rv:41.0) Gecko/41.0 Firefox/41.0',
    expected: { type: 'mobile' },
  },
  {
    desc: 'Unknown Tablet using Firefox',
    ua: 'Mozilla/5.0 (Android 4.4; Tablet; rv:41.0) Gecko/41.0 Firefox/41.0',
    expected: { type: 'tablet' },
  },
  {
    desc: 'Unknown Mobile using Focus for Android',
    ua: 'Mozilla/5.0 (Linux; Android 7.0) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Focus/1.0 Chrome/59.0.3029.83 Mobile Safari/537.36',
    expected: { type: 'mobile' },
  },
  {
    desc: 'Unknown Tablet using Focus for Android',
    ua: 'Mozilla/5.0 (Linux; Android 7.0) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Focus/1.0 Chrome/59.0.3029.83 Safari/537.36',
    expected: { type: 'tablet' },
  },
  {
    desc: 'Unknown Device using Focus for Android with GeckoView',
    ua: 'Mozilla/5.0 (Android 7.0; Mobile; rv:62.0) Gecko/62.0 Firefox/62.0',
    expected: { type: 'mobile' },
  },
  {
    desc: 'Unknown Mobile using Firefox OS',
    ua: 'Mozilla/5.0 (Mobile; rv:26.0) Gecko/26.0 Firefox/26.0',
    expected: { type: 'mobile' },
  },
  {
    desc: 'Unknown Tablet using Firefox OS',
    ua: 'Mozilla/5.0 (Tablet; rv:26.0) Gecko/26.0 Firefox/26.0',
    expected: { type: 'tablet' },
  },
  {
    desc: 'Unknown TV using Firefox OS',
    ua: 'Mozilla/5.0 (TV; rv:44.0) Gecko/44.0 Firefox/44.0',
    expected: { type: 'smarttv' },
  },
  {
    desc: 'PDA with Windows CE',
    ua: 'Mozilla/4.0 (PDA; Windows CE/1.0.1) NetFront/3.0',
    expected: { type: 'mobile' },
  },
  {
    desc: 'Windows IoT',
    ua: 'Mozilla/5.0 (Windows IoT 10.0; Android 6.0.1; WebView/3.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.140 Mobile Safari/537.36 Edge/18.17763',
    expected: { type: 'embedded' },
  },
  {
    desc: 'ChangHong Android TV',
    ua: 'Mozilla/5.0 (Linux; U; Android 5.1.1; zh-cn; ChangHong Android TV Build/LMY49J) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/66.0.3359.126 MQQBrowser/10.8 Mobile Safari/537.36',
    expected: { model: 'ChangHong', type: 'smarttv' },
  },
  {
    desc: 'MStar Android TV',
    ua: 'Mozilla/5.0 (Linux; Android 4.3.1; MStar Android TV Build/KTU84P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.95 Safari/537.36',
    expected: { model: 'MStar', type: 'smarttv' },
  },
  {
    desc: 'ONIDA Android TV',
    ua: 'Mozilla/5.0 (Linux; Android 6.0; ONIDA Android TV Build/MRA58K; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/48.0.2542.0 Mobile Safari/537.36',
    expected: { model: 'ONIDA', type: 'smarttv' },
  },
]

export const engineFixtures: UAFixture[] = [
  {
    desc: 'ArkWeb',
    ua: 'Mozilla/5.0 (Phone; OpenHarmony 4.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 ArkWeb/4.1.6.1 Mobile',
    expected: { name: 'ArkWeb', version: '4.1.6.1' },
  },
  {
    desc: 'Blink',
    ua: 'Mozilla/5.0 (Linux; Android 7.0; SM-G920I Build/NRD90M) AppleWebKit/537.36 (KHTML, like Gecko) OculusBrowser/3.4.9 SamsungBrowser/4.0 Chrome/57.0.2987.146 Mobile VR Safari/537.36',
    expected: { name: 'Blink', version: '57.0.2987.146' },
  },
  {
    desc: 'EdgeHTML',
    ua: 'Mozilla/5.0 (Windows NT 6.4; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/36.0.1985.143 Safari/537.36 Edge/12.0',
    expected: { name: 'EdgeHTML', version: '12.0' },
  },
  {
    desc: 'Flow',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_0) EkiohFlow/5.7.4.30559 Flow/5.7.4 (like Gecko Firefox/53.0 rv:53.0)',
    expected: { name: 'Flow', version: '5.7.4.30559' },
  },
  {
    desc: 'Gecko',
    ua: 'Mozilla/5.0 (X11; Linux x86_64; rv:2.0b9pre) Gecko/20110111 Firefox/4.0b9pre',
    expected: { name: 'Gecko', version: '2.0b9pre' },
  },
  {
    desc: 'Goanna',
    ua: 'Mozilla/5.0 (Windows NT 5.1; rv:38.9) Gecko/20100101 Goanna/2.2 Firefox/38.9 PaleMoon/26.5.0',
    expected: { name: 'Goanna', version: '2.2' },
  },
  {
    desc: 'KHTML',
    ua: 'Mozilla/5.0 (compatible; Konqueror/4.5; FreeBSD) KHTML/4.5.4 (like Gecko)',
    expected: { name: 'KHTML', version: '4.5.4' },
  },
  { desc: 'LibWeb', ua: 'Mozilla/5.0 (Linux; x86_64) Ladybird/1.0', expected: { name: 'LibWeb' } },
  {
    desc: 'LibWeb',
    ua: 'Mozilla/4.0 (SerenityOS; x86) LibWeb+LibJS (Not KHTML, nor Gecko) LibWeb',
    expected: { name: 'LibWeb' },
  },
  {
    desc: 'NetFront',
    ua: 'Mozilla/4.0 (PDA; Windows CE/1.0.1) NetFront/3.0',
    expected: { name: 'NetFront', version: '3.0' },
  },
  {
    desc: 'Presto',
    ua: 'Opera/9.80 (Windows NT 6.1; Opera Tablet/15165; U; en) Presto/2.8.149 Version/11.1',
    expected: { name: 'Presto', version: '2.8.149' },
  },
  {
    desc: 'Servo',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Servo/1.0 Firefox/111.0',
    expected: { name: 'Servo', version: '1.0' },
  },
  {
    desc: 'Tasman',
    ua: 'Mozilla/4.0 (compatible; MSIE 6.0; PPC Mac OS X 10.4.7; Tasman 1.0)',
    expected: { name: 'Tasman', version: '1.0' },
  },
  {
    desc: 'Trident',
    ua: 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2; Win64; x64; Trident/6.0)',
    expected: { name: 'Trident', version: '6.0' },
  },
  {
    desc: 'WebKit',
    ua: 'Mozilla/5.0 (Windows; U; Windows NT 6.1; sv-SE) AppleWebKit/533.19.4 (KHTML, like Gecko) Version/5.0.3 Safari/533.19.4',
    expected: { name: 'WebKit', version: '533.19.4' },
  },
  {
    desc: 'WebKit',
    ua: 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML like Gecko) Chrome/27.0.1453.110 Safari/537.36',
    expected: { name: 'WebKit', version: '537.36' },
  },
  {
    desc: 'WebOS TV 5.x',
    ua: 'Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36 WebAppManager',
    expected: { name: 'Blink', version: '68.0.3440.106' },
  },
  {
    desc: 'WebOS TV 4.x',
    ua: 'Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.34 Safari/537.36 WebAppManager',
    expected: { name: 'Blink', version: '53.0.2785.34' },
  },
  {
    desc: 'WebOS TV 3.x',
    ua: 'Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) QtWebEngine/5.2.1 Chrome/38.0.2125.122 Safari/537.36 WebAppManager',
    expected: { name: 'Blink', version: '38.0.2125.122' },
  },
  {
    desc: 'WebOS TV 2.x',
    ua: 'Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/538.2 (KHTML, like Gecko) Large Screen WebAppManager Safari/538.2',
    expected: { name: 'WebKit', version: '538.2' },
  },
  {
    desc: 'WebOS TV 1.x',
    ua: 'Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.41 (KHTML, like Gecko) Large Screen WebAppManager Safari/537.41',
    expected: { name: 'WebKit', version: '537.41' },
  },
]

export const osFixtures: UAFixture[] = [
  {
    desc: 'Windows 95',
    ua: 'Mozilla/1.22 (compatible; MSIE 2.0; Windows 95)',
    expected: { name: 'Windows', version: '95' },
  },
  {
    desc: 'Windows 98',
    ua: 'Mozilla/4.0 (compatible; MSIE 4.01; Windows 98)',
    expected: { name: 'Windows', version: '98' },
  },
  {
    desc: 'Windows ME',
    ua: 'Mozilla/5.0 (Windows; U; Win 9x 4.90) Gecko/20020502 CS 2000 7.0/7.0',
    expected: { name: 'Windows', version: 'ME' },
  },
  {
    desc: 'Windows 2000',
    ua: 'Mozilla/3.0 (compatible; MSIE 3.0; Windows NT 5.0)',
    expected: { name: 'Windows', version: '2000' },
  },
  {
    desc: 'Windows XP',
    ua: 'Mozilla/5.0 (Windows; U; MSIE 7.0; Windows NT 5.2)',
    expected: { name: 'Windows', version: 'XP' },
  },
  {
    desc: 'Windows Vista',
    ua: 'Mozilla/5.0 (compatible; MSIE 7.0; Windows NT 6.0; fr-FR)',
    expected: { name: 'Windows', version: 'Vista' },
  },
  {
    desc: 'Windows 7',
    ua: 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; Trident/6.0)',
    expected: { name: 'Windows', version: '7' },
  },
  {
    desc: 'Windows 8',
    ua: 'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.2; Win64; x64; Trident/6.0; .NET4.0E; .NET4.0C)',
    expected: { name: 'Windows', version: '8' },
  },
  {
    desc: 'Windows 10',
    ua: 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.71 Safari/537.36 Edge/12.0',
    expected: { name: 'Windows', version: '10' },
  },
  {
    desc: 'Windows IoT',
    ua: 'Mozilla/5.0 (Windows IoT 10.0; Android 6.0.1; WebView/3.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.140 Mobile Safari/537.36 Edge/18.17763',
    expected: { name: 'Windows IoT', version: '10.0' },
  },
  {
    desc: 'WeChat Desktop for Windows Built-in Browser',
    ua: 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.95 Safari/537.36 MicroMessenger/6.5.2.501 NetType/WIFI WindowsWechat QBCore/3.43.901.400 QQBrowser/9.0.2524.400',
    expected: { name: 'Windows', version: '7' },
  },
  {
    desc: 'WeChat Desktop for Windows Built-in Browser major version in 4',
    ua: 'mozilla/5.0 (windows nt 6.1; wow64) applewebkit/537.36 (khtml, like gecko) chrome/81.0.4044.138 safari/537.36 nettype/wifi micromessenger/7.0.20.1781(0x6700143b) windowswechat',
    expected: { name: 'Windows', version: '7' },
  },
  {
    desc: 'Windows RT',
    ua: 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2; ARM; Trident/6.0)',
    expected: { name: 'Windows', version: 'RT' },
  },
  {
    desc: 'Windows CE',
    ua: 'Mozilla/4.0 (compatible; MSIE 6.0; Windows CE; IEMobile 7.11)',
    expected: { name: 'Windows', version: 'CE' },
  },
  {
    desc: 'Windows Mobile',
    ua: 'Mozilla/5.0 (ZTE-E_N72/N72V1.0.0B02;U;Windows Mobile/6.1;Profile/MIDP-2.0 Configuration/CLDC-1.1;320*240;CTC/2.0) IE/6.0 (compatible; MSIE 4.01; Windows CE; PPC)/UC Browser7.7.1.88',
    expected: { name: 'Windows Mobile', version: '6.1' },
  },
  {
    desc: 'Windows Mobile',
    ua: 'Opera/9.80 (Windows Mobile; WCE; Opera Mobi/WMD-50433; U; en) Presto/2.4.13 Version/10.00',
    expected: { name: 'Windows Mobile' },
  },
  {
    desc: 'Windows Phone',
    ua: 'Opera/9.80 (Windows Phone; Opera Mini/7.6.8/35.7518; U; ru) Presto/2.8.119 Version/11.10',
    expected: { name: 'Windows Phone' },
  },
  {
    desc: 'Windows Phone OS',
    ua: 'Mozilla/4.0 (compatible; MSIE 7.0; Windows Phone OS 7.0; Trident/3.1; IEMobile/7.0; DELL; Venue Pro)',
    expected: { name: 'Windows Phone OS', version: '7.0' },
  },
  {
    desc: 'Windows Phone 8',
    ua: 'Mozilla/5.0 (compatible; MSIE 10.0; Windows Phone 8.0; Trident/6.0; IEMobile/10.0; ARM; Touch; HTC; Windows Phone 8X by HTC)',
    expected: { name: 'Windows Phone', version: '8.0' },
  },
  {
    desc: 'Windows NT on x86 or aarch64 CPU using Firefox',
    ua: 'Mozilla/5.0 (Windows NT x.y; rv:10.0) Gecko/20100101 Firefox/10.0',
    expected: { name: 'Windows', version: 'NT x' },
  },
  {
    desc: 'Windows NT on x64 CPU using Firefox',
    ua: 'Mozilla/5.0 (Windows NT x.y; Win64; x64; rv:10.0) Gecko/20100101 Firefox/10.0',
    expected: { name: 'Windows', version: 'NT x' },
  },
  {
    desc: 'BlackBerry',
    ua: 'BlackBerry9300/5.0.0.912 Profile/MIDP-2.1 Configuration/CLDC-1.1 VendorID/378',
    expected: { name: 'BlackBerry', version: '5.0.0.912' },
  },
  {
    desc: 'BlackBerry 10',
    ua: 'Mozilla/5.0 (BB10; Touch) AppleWebKit/537.3+ (KHTML, like Gecko) Version/10.0.9.386 Mobile Safari/537.3+',
    expected: { name: 'BlackBerry', version: '10' },
  },
  {
    desc: 'Tizen',
    ua: 'Mozilla/5.0 (SMART-TV; Linux; Tizen 2.3) AppleWebkit/538.1 (KHTML, like Gecko) SamsungBrowser/1.0 TV Safari/538.1',
    expected: { name: 'Tizen', version: '2.3' },
  },
  {
    desc: 'Tizen',
    ua: 'Mozilla/5.0 (Linux; Tizen 2.3; SAMSUNG SM-Z130H) AppleWebKit/537.3 (KHTML, like Gecko) Version/2.3 Mobile Safari/537.3',
    expected: { name: 'Tizen', version: '2.3' },
  },
  {
    desc: 'Tizen 6.0',
    ua: 'HbbTV/1.5.1 (+DRM;Samsung;SmartTV2021:UAU7000;T-KSU2EDEUC-1506.0;KantSU2e;urn:samsungtv:familyname:21_KANTSU2E_UHD_BASIC:2021;) Tizen/6.0 (+TVPLUS+SmartHubLink) Chrome/76 LaTivu_1.0.1_2021 RVID/17',
    expected: { name: 'Tizen', version: '6.0' },
  },
  {
    desc: 'Android',
    ua: 'Mozilla/5.0 (Linux; U; Android 2.2.2; en-us; VM670 Build/FRG83G) AppleWebKit/533.1 (KHTML, like Gecko)',
    expected: { name: 'Android', version: '2.2.2' },
  },
  {
    desc: 'MIUI',
    ua: 'Dalvik/2.1.0 (Linux; U; Android 9; Mi MIX 3 5G MIUI/V10.3.2.0.PEMEUVF)',
    expected: { name: 'Android', version: '9' },
  },
  {
    desc: 'HarmonyOS',
    ua: 'Mozilla/5.0 (Linux; Android 10; HarmonyOS; YAL-AL10; HMSCore 6.3.0.327; GMSCore 21.48.15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.105 HuaweiBrowser/12.0.3.310 Mobile Safari/537.36',
    expected: { name: 'HarmonyOS', version: '10' },
  },
  {
    desc: 'Sailfish',
    ua: 'Mozilla/5.0 (Linux; U; Sailfish 3.0; Mobile; rv:45.0) Gecko/45.0 Firefox/45.0 SailfishBrowser/1.0',
    expected: { name: 'Sailfish', version: '3.0' },
  },
  {
    desc: 'WebOS',
    ua: 'Mozilla/5.0 (hp-tablet; Linux; hpwOS/3.0.5; U; en-US) AppleWebKit/534.6 (KHTML, like Gecko) wOSBrowser/234.83 Safari/534.6 TouchPad/1.0',
    expected: { name: 'webOS', version: '3.0.5' },
  },
  {
    desc: 'WebOS',
    ua: 'Mozilla/5.0 (webOS/1.4.5; U; en-US) AppleWebKit/532.2 (KHTML, like Gecko) Version/1.0 Safari/532.2 Pre/1.0',
    expected: { name: 'webOS', version: '1.4.5' },
  },
  {
    desc: 'WebOS TV 5.x',
    ua: 'Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36 WebAppManager',
    expected: { name: 'webOS', version: 'TV' },
  },
  {
    desc: 'WebOS TV 4.x',
    ua: 'Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.34 Safari/537.36 WebAppManager',
    expected: { name: 'webOS', version: 'TV' },
  },
  {
    desc: 'WebOS TV 3.x',
    ua: 'Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) QtWebEngine/5.2.1 Chrome/38.0.2125.122 Safari/537.36 WebAppManager',
    expected: { name: 'webOS', version: 'TV' },
  },
  {
    desc: 'WebOS TV 2.x',
    ua: 'Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/538.2 (KHTML, like Gecko) Large Screen WebAppManager Safari/538.2',
    expected: { name: 'webOS', version: 'TV' },
  },
  {
    desc: 'WebOS TV 1.x',
    ua: 'Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.41 (KHTML, like Gecko) Large Screen WebAppManager Safari/537.41',
    expected: { name: 'webOS', version: 'TV' },
  },
  {
    desc: 'QNX',
    ua: 'Mozilla/5.0 (Photon; U; QNX x86pc; en-US; rv:1.8.1.20) Gecko/20090127 BonEcho/2.0.0.20',
    expected: { name: 'QNX' },
  },
  {
    desc: 'Bada',
    ua: 'Mozilla/5.0 (SAMSUNG; SAMSUNG-GT-S5253/S5253DDKC1; U; Bada/1.0; en-us) AppleWebKit/533.1 (KHTML, like Gecko) Dolfin/2.0 Mobile WQVGA SMM-MMS/1.2.0 OPN-B',
    expected: { name: 'Bada', version: '1.0' },
  },
  {
    desc: 'RIM Tablet OS',
    ua: 'Mozilla/5.0 (PlayBook; U; RIM Tablet OS 2.1.0; en-US) AppleWebKit/536.2+ (KHTML like Gecko) Version/7.2.1.0 Safari/536.2+',
    expected: { name: 'RIM Tablet OS', version: '2.1.0' },
  },
  {
    desc: 'Nokia N900 Linux mobile, on the Fennec browser',
    ua: 'Mozilla/5.0 (Maemo; Linux armv7l; rv:10.0) Gecko/20100101 Firefox/10.0 Fennec/10.0',
    expected: { name: 'Maemo' },
  },
  {
    desc: 'Nokia N900 Linux mobile, on the Maemo browser',
    ua: 'Mozilla/5.0(X11; U; Linux armv7l; fr-FR; rv:1.9.2a1pre) Gecko/20091127 Firefox/3.5 Maemo Browser 1.5.6 RX-51 N900',
    expected: { name: 'Maemo' },
  },
  {
    desc: 'Nokia N900 Linux mobile, on the Maemo browser',
    ua: 'Mozilla/5.0 (Linux; Maemo 5.0; Nokia N900; Build/4.0.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Mobile Safari/537.36',
    expected: { name: 'Maemo', version: '5.0' },
  },
  {
    desc: 'MeeGo',
    ua: 'Mozilla/5.0 (MeeGo; NokiaN9) AppleWebKit/534.13 (KHTML, like Gecko) NokiaBrowser/8.5.0 Mobile Safari/534.13',
    expected: { name: 'MeeGo' },
  },
  {
    desc: 'Nokia 5250',
    ua: 'Nokia5250/10.0.011 (SymbianOS/9.4; U; Series60/5.0 Mozilla/5.0; Profile/MIDP-2.1 Configuration/CLDC-1.1 ) AppleWebKit/525 (KHTML, like Gecko) Safari/525 3gpp-gba',
    expected: { name: 'Symbian', version: '9.4' },
  },
  {
    desc: 'Nokia N79',
    ua: 'Mozilla/5.0 (SymbianOS/9.3; U; Series60/3.2 NokiaN79-1/32.001; Profile/MIDP-2.1 Configuration/CLDC-1',
    expected: { name: 'Symbian', version: '9.3' },
  },
  {
    desc: 'Nokia E71',
    ua: 'Mozilla/5.0 (SymbianOS/9.2; U; Series60/3.1 NokiaE71-1/110.07.127; Profile/MIDP-2.0 Configuration/CLDC-1.1 ) AppleWebKit/413 (KHTML, like Gecko) Safari/413',
    expected: { name: 'Symbian', version: '9.2' },
  },
  {
    desc: 'Opera Mini on S60',
    ua: 'Opera/9.80 (Series 60; Opera Mini/7.1.32444/191.361; U; de) Presto/2.12.423 Version/12.16',
    expected: { name: 'Symbian' },
  },
  {
    desc: 'NokiaBrowser on Nokia C7',
    ua: 'Mozilla/5.0 (Symbian/3; Series60/5.2 NokiaC7-00/024.001; Profile/MIDP-2.1 Configuration/CLDC-1.1 ) AppleWebKit/533.4 (KHTML, like Gecko) NokiaBrowser/7.3.1.37 Mobile Safari/533.4 3gpp-gba',
    expected: { name: 'Symbian', version: '3' },
  },
  {
    desc: 'Nokia 808 PureView',
    ua: 'Mozilla/5.0 (Symbian/3; Series60/5.5 Nokia808PureView/113.010.1508; Profile/MIDP-2.1 Configuration/CLDC-1.1 ) AppleWebKit/535.1 (KHTML, like Gecko) NokiaBrowser/8.3.2.21 Mobile Safari/535.1 3gpp-gba',
    expected: { name: 'Symbian', version: '3' },
  },
  {
    desc: 'Nokia 808 PureView',
    ua: 'Mozilla/5.0 (Symbian; U; Nokia808 PureView; en-GB) AppleWebKit/534.3 (KHTML, like Gecko) Version/3.0 Mobile/1A543a Mobile Safari/534.3',
    expected: { name: 'Symbian' },
  },
  {
    desc: 'Series40',
    ua: 'Mozilla/5.0 (Series40; Nokia2055/03.20; Profile/MIDP-2.1 Configuration/CLDC-1.1) Gecko/20100401 S40OviBrowser/2.2.0.0.34',
    expected: { name: 'Series40' },
  },
  {
    desc: 'Firefox OS',
    ua: 'Mozilla/5.0 (Mobile; rv:14.0) Gecko/14.0 Firefox/14.0',
    expected: { name: 'Firefox OS', version: '14.0' },
  },
  {
    desc: 'Firefox OS on Tablet',
    ua: 'Mozilla/5.0 (Tablet; rv:26.0) Gecko/26.0 Firefox/26.0',
    expected: { name: 'Firefox OS', version: '26.0' },
  },
  {
    desc: 'Firefox OS on TV',
    ua: 'Mozilla/5.0 (TV; rv:44.0) Gecko/44.0 Firefox/44.0',
    expected: { name: 'Firefox OS', version: '44.0' },
  },
  {
    desc: 'Google Chromecast',
    ua: 'Mozilla/5.0 (X11; Linux aarch64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.81 Safari/537.36 CrKey/1.42.183786',
    expected: { name: 'Chromecast', version: '1.42.183786' },
  },
  {
    desc: 'Nintendo Switch',
    ua: 'Mozilla/5.0 (Nintendo Switch; WifiWebAuthApplet) AppleWebKit/606.4 (KHTML, like Gecko) NF/6.0.1.15.4 NintendoBrowser/5.1.0.20393',
    expected: { name: 'Nintendo', version: 'Switch' },
  },
  {
    desc: 'PlayStation 4',
    ua: 'Mozilla/5.0 (PlayStation 4 3.00) AppleWebKit/537.73 (KHTML, like Gecko)',
    expected: { name: 'PlayStation', version: '4' },
  },
  {
    desc: 'Xbox 360',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; Xbox; Xbox 360) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36',
    expected: { name: 'Xbox', version: '360' },
  },
  {
    desc: 'Xbox One',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; Xbox; Xbox One; WebView/3.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.102 Safari/537.36 Edge/18.19041',
    expected: { name: 'Xbox', version: 'One' },
  },
  {
    desc: 'Xbox X',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; Xbox; Xbox X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.82 Safari/537.36 Edge/20.02',
    expected: { name: 'Xbox', version: 'X' },
  },
  {
    desc: 'Xbox Series X',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; Xbox; Xbox Series X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.82 Safari/537.36 Edge/20.02 ',
    expected: { name: 'Xbox', version: 'Series X' },
  },
  {
    desc: 'Mint',
    ua: 'Opera/9.80 (X11; Linux x86_64; Edition Linux Mint) Presto/2.12.388 Version/12.16',
    expected: { name: 'Mint' },
  },
  {
    desc: 'Mint',
    ua: 'Opera/9.64 (X11; Linux i686; U; Linux Mint; nb) Presto/2.1.1',
    expected: { name: 'Mint' },
  },
  {
    desc: 'Mint',
    ua: 'Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.9.0.5) Gecko/2008121622 Linux Mint/6 (Felicia) Firefox/3.0.4',
    expected: { name: 'Mint', version: '6' },
  },
  {
    desc: 'Ubuntu',
    ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/535.22+ (KHTML, like Gecko) Chromium/17.0.963.56 Chrome/17.0.963.56 Safari/535.22+ Ubuntu/12.04 (3.4.1-0ubuntu1) Epiphany/3.4.1',
    expected: { name: 'Ubuntu', version: '12.04' },
  },
  {
    desc: 'Ubuntu',
    ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/31.0.1650.63 Chrome/31.0.1650.63 Safari/537.36',
    expected: { name: 'Ubuntu' },
  },
  {
    desc: 'Ubuntu Touch',
    ua: 'Mozilla/5.0 (Linux; Ubuntu 16.04 like Android 4.4) AppleWebKit/537.36 Chromium/65.0.3325.151 Mobile Safari/537.36',
    expected: { name: 'Ubuntu Touch', version: '16.04' },
  },
  {
    desc: 'Kubuntu',
    ua: 'Mozilla/5.0 (compatible; Konqueror/4.4; Linux 2.6.32-22-generic; X11; en_US) KHTML/4.4.3 (like Gecko) Kubuntu',
    expected: { name: 'Kubuntu' },
  },
  {
    desc: 'Debian',
    ua: 'Mozilla/5.0 (compatible; Konqueror/3.5; Linux) KHTML/3.5.7 (like Gecko) (Debian)',
    expected: { name: 'Debian' },
  },
  {
    desc: 'Debian',
    ua: 'Mozilla/5.0 (X11; Linux x86_64; Debian GNU/Linux 8.1 (jessie)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/33.0.1750.0 Maxthon/1.0.5.3 Safari/537.36',
    expected: { name: 'Debian', version: '8.1' },
  },
  {
    desc: 'Debian',
    ua: 'ELinks/0.12~pre5-4 (textmode; Debian; Linux 3.2.0-4-amd64 x86_64 192x47-2)',
    expected: { name: 'Debian' },
  },
  { desc: 'Debian', ua: 'w3m/0.5.3+debian-19', expected: { name: 'debian', version: '19' } },
  {
    desc: 'Debian',
    ua: 'Mozilla/5.0 (X11; U; Linux x86_64; en-US; rv:1.9.0.3) Gecko/2008092814 (Debian-3.0.1-1)',
    expected: { name: 'Debian', version: '3.0.1-1' },
  },
  {
    desc: 'Debian',
    ua: 'Mozilla/5.0 (compatible; Konqueror/3.5; Linux 2.6.24.4; X11) KHTML/3.5.9 (like Gecko) (Debian package 4:3.5.9.dfsg.1-2+b1)',
    expected: { name: 'Debian' },
  },
  {
    desc: 'OpenSUSE',
    ua: 'Mozilla/5.0 (X11; U; Linux x86_64; en-US; rv:1.9.2.17) Gecko/20110420 SUSE/3.6.17-0.2.1 Firefox/3.6.17',
    expected: { name: 'SUSE', version: '3.6.17-0.2.1' },
  },
  {
    desc: 'Gentoo',
    ua: 'Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.8.1.16) Gecko/20080716 (Gentoo) Galeon/2.0.6',
    expected: { name: 'Gentoo' },
  },
  {
    desc: 'Gentoo',
    ua: 'Xombrero (X11; U; Gentoo Linux amd64; en-US) Webkit/2.8.5',
    expected: { name: 'Gentoo', version: 'amd64' },
  },
  { desc: 'Gentoo', ua: 'Xombrero/1.6.4 (Linux amd64; en; Gentoo)', expected: { name: 'Gentoo' } },
  {
    desc: 'Gentoo',
    ua: 'Links (2.8; Linux 3.17.2-gentoo-x86 i686; GNU C 4.8.2; x)',
    expected: { name: 'gentoo', version: 'x86' },
  },
  { desc: 'Arch', ua: 'Uzbl (Webkit 1.1.10) (Arch Linux)', expected: { name: 'Arch' } },
  {
    desc: 'Slackware',
    ua: 'Mozilla/5.0 Slackware/13.37 (X11; U; Linux x86_64; en-US) AppleWebKit/535.1 (KHTML, like Gecko) Chrome/13.0.782.41',
    expected: { name: 'Slackware', version: '13.37' },
  },
  {
    desc: 'Fedora',
    ua: 'Mozilla/5.0 (X11; Fedora; Linux x86_64; rv:40.0) Gecko/20100101 Firefox/40.0',
    expected: { name: 'Fedora' },
  },
  {
    desc: 'Fedora',
    ua: 'Mozilla/5.0 (X11; U; Linux i686; en-GB; rv:2.0) Gecko/20110404 Fedora/16-dev Firefox/4.0',
    expected: { name: 'Fedora', version: '16-dev' },
  },
  {
    desc: 'Fedora',
    ua: 'Mozilla/5.0 (X11; U; Linux i686; sk; rv:1.9.0.4) Gecko/2008111217 Fedora/3.0.4-1.fc10 Firefox/3.0.4',
    expected: { name: 'Fedora', version: '3.0.4-1.fc10' },
  },
  {
    desc: 'Mandriva',
    ua: 'Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.9.2.22) Gecko/20110907 Mandriva Linux/1.9.2.22-0.1mdv2010.2 (2010.2) Firefox/3.6.22',
    expected: { name: 'Mandriva', version: '1.9.2.22-0.1mdv2010.2' },
  },
  {
    desc: 'Chrome OS',
    ua: 'Mozilla/5.0 (X11; CrOS x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.0.0 Safari/537.36',
    expected: { name: 'Chromium OS' },
  },
  {
    desc: 'Chromium OS',
    ua: 'Mozilla/5.0 (X11; CrOS x86_64 10575.58.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36',
    expected: { name: 'Chromium OS', version: '10575.58.0' },
  },
  {
    desc: 'Fuchsia',
    ua: 'Mozilla/5.0 (X11; Fuchsia x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3557.0 Safari/537.36',
    expected: { name: 'Fuchsia' },
  },
  {
    desc: 'Solaris',
    ua: 'Mozilla/5.0 (X11; U; SunOS sun4u; en-US; rv:1.7) Gecko/20070606',
    expected: { name: 'Solaris', version: 'sun4u' },
  },
  {
    desc: 'FreeBSD',
    ua: 'Mozilla/5.0 (X11; U; FreeBSD x86_64; en-US) AppleWebKit/534.16 (KHTML, like Gecko) Chrome/10.0.648.204 Safari/534.16',
    expected: { name: 'FreeBSD' },
  },
  {
    desc: 'OpenBSD',
    ua: 'Mozilla/5.0 (X11; U; OpenBSD i386; en-US; rv:1.9.1) Gecko/20090702 Firefox/3.5',
    expected: { name: 'OpenBSD' },
  },
  {
    desc: 'NetBSD',
    ua: 'ELinks (0.4.3; NetBSD 3.0.2PATCH sparc64; 141x19)',
    expected: { name: 'NetBSD', version: '3.0.2PATCH' },
  },
  {
    desc: 'DragonFly',
    ua: 'Mozilla/5.0 (X11; U; DragonFly i386; de; rv:1.9.1) Gecko/20090720 Firefox/3.5.1',
    expected: { name: 'DragonFly' },
  },
  {
    desc: 'iOS in App',
    ua: 'AppName/version CFNetwork/version Darwin/version',
    expected: { name: 'iOS' },
  },
  {
    desc: 'iOS with Chrome',
    ua: 'Mozilla/5.0 (iPhone; U; CPU iPhone OS 5_1_1 like Mac OS X; en) AppleWebKit/534.46.0 (KHTML, like Gecko) CriOS/19.0.1084.60 Mobile/9B206 Safari/7534.48.3',
    expected: { name: 'iOS', version: '5.1.1' },
  },
  {
    desc: 'iOS with Opera Mini',
    ua: 'Opera/9.80 (iPhone; Opera Mini/7.1.32694/27.1407; U; en) Presto/2.8.119 Version/11.10',
    expected: { name: 'iOS' },
  },
  {
    desc: 'iOS with FaceBook Mobile App',
    ua: '[FBAN/FBIOS;FBAV/283.0.0.44.117;FBBV/238386386;FBDV/iPhone12,1;FBMD/iPhone;FBSN/iOS;FBSV/13.6.1;FBSS/2;FBID/phone;FBLC/en_US;FBOP/5;FBRV/240127608]',
    expected: { name: 'iOS', version: '13.6.1' },
  },
  {
    desc: 'iOS with Slack App',
    ua: 'com.tinyspeck.chatlyio/23.04.10 (iPhone; iOS 16.4.1; Scale/3.00)',
    expected: { name: 'iOS', version: '16.4.1' },
  },
  {
    desc: 'Apple HomePod',
    ua: 'AppleCoreMedia/1.0.0.15D61 (HomePod; U; CPU OS 11_2_5 like Mac OS X; en_us)',
    expected: { name: 'iOS', version: '11.2.5' },
  },
  {
    desc: 'watchOS',
    ua: 'server-bag [Watch OS,8.4,19S546,Watch3,4]',
    expected: { name: 'watchOS', version: '8.4' },
  },
  {
    desc: 'watchOS',
    ua: 'atc/1.0 watchOS/7.4.1 model/Watch3,3 hwp/t8004 build/18T201 (6; dt:155)',
    expected: { name: 'watchOS', version: '7.4.1' },
  },
  {
    desc: 'watchOS',
    ua: 'Watch4,3/5.3.8 (16U680)',
    expected: { name: 'watchOS', version: '5.3.8' },
  },
  {
    desc: 'Mac OS on PowerPC',
    ua: 'Mozilla/4.0 (compatible; MSIE 5.0b1; Mac_PowerPC)',
    expected: { name: 'Mac OS' },
  },
  {
    desc: 'Mac OS X on x86, x86_64, or aarch64 using Firefox',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X x.y; rv:10.0) Gecko/20100101 Firefox/10.0',
    expected: { name: 'Mac OS', version: 'x.y' },
  },
  {
    desc: 'Mac OS X on PowerPC using Firefox',
    ua: 'Mozilla/5.0 (Macintosh; PPC Mac OS X x.y; rv:10.0) Gecko/20100101 Firefox/10.0',
    expected: { name: 'Mac OS', version: 'x.y' },
  },
  {
    desc: 'Mac OS',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/28.0.1500.95 Safari/537.36',
    expected: { name: 'Mac OS', version: '10.6.8' },
  },
  {
    desc: 'Haiku',
    ua: 'Mozilla/5.0 (Macintosh; Intel Haiku R1 x86) AppleWebKit/602.1.1 (KHTML, like Gecko) WebPositive/1.2 Version/8.0 Safari/602.1.1',
    expected: { name: 'Haiku', version: 'R1' },
  },
  {
    desc: 'KaiOS',
    ua: 'Mozilla/5.0 (Mobile; Nokia_8110_4G; rv:48.0) Gecko/48.0 Firefox/48.0 KAIOS/2.5',
    expected: { name: 'KAIOS', version: '2.5' },
  },
  {
    desc: 'iTunes Windows Vista',
    ua: 'iTunes/10.7 (Windows; Microsoft Windows Vista Home Premium Edition Service Pack 1 (Build 6001)) AppleWebKit/536.26.9',
    expected: { name: 'Windows', version: 'Vista' },
  },
  {
    desc: 'iOS BE App',
    ua: 'APP-BE Test/1.0 (iPad; Apple; CPU iPhone OS 7_0_2 like Mac OS X)',
    expected: { name: 'iOS', version: '7.0.2' },
  },
  {
    desc: 'KTB-Nexus 5',
    ua: 'APP-My App/1.0 (Linux; Android 4.2.1; Nexus 5 Build/JOP40D)',
    expected: { name: 'Android', version: '4.2.1' },
  },
  {
    desc: 'Solaris',
    ua: 'NCSA Mosaic/1.0 (X11;SunOS 4.1.4 sun4m)',
    expected: { name: 'Solaris', version: '4.1.4' },
  },
  {
    desc: 'Raspbian',
    ua: 'Mozilla/5.0 (X11; Linux armv7l) AppleWebKit/537.36 (KHTML, like Gecko) Raspbian Chromium/72.0.3626.121 HeadlessChrome/72.0.3626.121 Safari/537.36',
    expected: { name: 'Raspbian' },
  },
  {
    desc: 'Raspbian',
    ua: 'Mozilla/5.0 (X11; Linux armv7l) AppleWebKit/538.15 (KHTML, like Gecko) Version/8.0 Safari/538.15 Raspbian/9.0 (1:3.8.2.0-0rpi28) Epiphany/3.8.2',
    expected: { name: 'Raspbian', version: '9.0' },
  },
  {
    desc: 'AIX',
    ua: 'Mozilla/5.0 (X11; U; AIX 000138384C00; en-US; rv:1.0.1) Gecko/20030213 Netscape/7.0',
    expected: { name: 'AIX' },
  },
  {
    desc: 'Plan9',
    ua: 'NCSA_Mosaic/5.0 (X11;Plan 9 4.0)',
    expected: { name: 'Plan 9', version: '4.0' },
  },
  {
    desc: 'Minix',
    ua: 'Mozilla/5.0 (X11; Original ; Minix 3.3 ; rv:3.0)',
    expected: { name: 'Minix', version: '3.3' },
  },
  {
    desc: 'BeOS',
    ua: 'Mozilla/5.0 (BeOS; U; BeOS BePC; en-US; rv:1.8.1.8pre) Gecko/20070926 SeaMonkey/1.1.5pre',
    expected: { name: 'BeOS' },
  },
  { desc: 'OS/2', ua: 'Links (2.1pre14; OS/2 1 i386; 80x33)', expected: { name: 'OS/2' } },
  {
    desc: 'AmigaOS',
    ua: 'Mozilla/4.0 (compatible; AWEB 3.4 SE; AmigaOS)',
    expected: { name: 'AmigaOS' },
  },
  { desc: 'MorphOS', ua: 'AmigaVoyager/3.4.4 (MorphOS/PPC native)', expected: { name: 'MorphOS' } },
  {
    desc: 'UNIX',
    ua: 'Surf/0.4.1 (X11; U; Unix; en-US) AppleWebKit/531.2+ Compatible (Safari)',
    expected: { name: 'Unix' },
  },
  {
    desc: 'Joli',
    ua: 'Mozilla/5.0 (X11; Jolicloud Linux i686) AppleWebKit/537.6 (KHTML, like Gecko) Joli OS/1.2 Chromium/23.0.1240.0 Chrome/23.0.1240.0 Safari/537.6',
    expected: { name: 'Joli', version: '1.2' },
  },
  {
    desc: 'CentOS',
    ua: 'Konqueror/15.13 (CentOS Linux 7.4; cs-CZ;)',
    expected: { name: 'CentOS', version: '7.4' },
  },
  {
    desc: 'PCLinuxOS',
    ua: 'Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.9.2.13) Gecko/20101209 PCLinuxOS/1.9.2.13-1pclos2010 (2010) Firefox/3.6.13',
    expected: { name: 'PCLinuxOS', version: '1.9.2.13-1pclos2010' },
  },
  {
    desc: 'RedHat',
    ua: 'Mozilla/5.0 (compatible; Konqueror/4.3; Linux) KHTML/4.3.4 (like Gecko) Red Hat Enterprise Linux/4.3.4-11.el6_1.4',
    expected: { name: 'Red Hat', version: '4.3.4-11.el6_1.4' },
  },
  {
    desc: 'RedHat',
    ua: 'Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.8.0.13pre) Gecko/20070717 Red Hat/1.0.9-4.el4 SeaMonkey/1.0.9',
    expected: { name: 'Red Hat', version: '1.0.9-4.el4' },
  },
  {
    desc: 'RedHat',
    ua: 'iTunes/4.7.1 (Linux; N; Red Hat; x86_64-linux; EN; utf8) SqueezeCenter, Squeezebox Server, Logitech Media Server/7.9.1/1522157629',
    expected: { name: 'Red Hat' },
  },
  {
    desc: 'RedHat',
    ua: 'curl/7.20.0 (x86_64-redhat-linux-gnu) libcurl/7.20.0 OpenSSL/0.9.8b zlib/1.2.3 libidn/0.6.5',
    expected: { name: 'redhat' },
  },
  {
    desc: 'RISC OS',
    ua: 'Mozilla/1.10 [en] (Compatible; RISC OS 3.70; Oregano 1.10)',
    expected: { name: 'RISC OS', version: '3.70' },
  },
  {
    desc: 'Zenwalk',
    ua: 'Flock/2.16 (Zenwalk 7.3; es_PR;)',
    expected: { name: 'Zenwalk', version: '7.3' },
  },
  {
    desc: 'Hurd',
    ua: 'Mozilla/5.0 (X11; Hurd 0.9 i386; en-US) libwww-FM/2.14 SSL-MM/1.4.1 GNUTLS/3.7.0 Safari/696.96',
    expected: { name: 'Hurd', version: '0.9' },
  },
  {
    desc: 'Linux',
    ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.157 Safari/537.36',
    expected: { name: 'Linux' },
  },
  {
    desc: 'Deepin',
    ua: 'Mozilla/5.0 (X11; Linux x86_64; Deepin 15.5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.75 Safari/537.36 NFSBrowser/5.0.0.1886',
    expected: { name: 'Deepin', version: '15.5' },
  },
  {
    desc: 'Palm OS',
    ua: 'Mozilla/4.76 [en] (PalmOS; U; WebPro3.0; Palm-Arz1)',
    expected: { name: 'Palm' },
  },
  {
    desc: 'Panasonic Viera',
    ua: 'HbbTV/1.2.1 (;Panasonic;VIERA 2015;3.014;a001-003 4000-0000;)',
    expected: { name: 'VIERA' },
  },
  {
    desc: 'Netrange Smart TV',
    ua: 'Mozilla/5.0 (Linux; U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Safari/537.36 OPR/46.0.2207.0 LOEWE-SL410/5.2.0.0 HbbTV/1.4.1 (; LOEWE; SL410; LOH/5.2.0.0;;) FVC/3.0 (LOEWE; SL410;) CE-HTML/1.0 Config (L:deu,CC:DEU) NETRANGEMMH',
    expected: { name: 'NETRANGE' },
  },
  {
    desc: 'NetTV 3.2.1',
    ua: 'Opera/9.80 (Linux mips ; U; HbbTV/1.1.1 (; Philips; ; ; ; ) CE-HTML/1.0 NETTV/3.2.1; en) Presto/2.6.33 Version/10.70',
    expected: { name: 'NETTV', version: '3.2.1' },
  },
  {
    desc: 'HP-UX',
    ua: 'Mozilla/5.0 (X11; U; HP-UX 9000/785; es-ES; rv:1.0.1) Gecko/20020827 Netscape/7.0',
    expected: { name: 'HP-UX' },
  },
  {
    desc: 'Contiki',
    ua: 'Contiki/1.0 (Commodore 64; http://dunkels.com/adam/contiki/)',
    expected: { name: 'Contiki', version: '1.0' },
  },
  {
    desc: 'Linpus',
    ua: 'Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.9b5pre) Gecko/2008032619 Linpus/3.0-0.49',
    expected: { name: 'Linpus', version: '3.0-0.49' },
  },
  {
    desc: 'Manjaro',
    ua: 'Mozilla/5.0 (X11; Manjaro 19.0.2; Arch; x64; rv:84.0) Gecko/20100101 Firefox/84.0',
    expected: { name: 'Manjaro', version: '19.0.2' },
  },
  {
    desc: 'elementary OS',
    ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/604.1 (KHTML, like Gecko) Version/11.0 Safari/604.1 elementary OS/0.4 (Loki) Epiphany/3.18.11',
    expected: { name: 'elementary OS', version: '0.4' },
  },
  {
    desc: 'GhostBSD',
    ua: 'Mozilla/5.0 (X11; GhostBSD/10.3; x86_64; rv:50.0.1) Gecko/20100101 Firefox/50.0.1',
    expected: { name: 'GhostBSD', version: '10.3' },
  },
  {
    desc: 'Android-x86',
    ua: 'Mozilla/5.0 (Linux; Android 7.1.2; Generic Android-x86) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36 OPR/61.2.3076.56749',
    expected: { name: 'Android-x86', version: '7.1.2' },
  },
  {
    desc: 'Sabayon',
    ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/536.5 (KHTML, like Gecko) Sabayon Chrome/19.0.1084.46 Safari/536.5',
    expected: { name: 'Sabayon' },
  },
  {
    desc: 'Linspire',
    ua: 'Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.8.0.4) Gecko/20060803 Firefox/1.5.0.4 Linspire/1.5.0.4',
    expected: { name: 'Linspire', version: '1.5.0.4' },
  },
  {
    desc: 'SerenityOS',
    ua: 'Mozilla/4.0 (SerenityOS; x86) LibWeb+LibJS (Not KHTML, nor Gecko) LibWeb',
    expected: { name: 'SerenityOS' },
  },
  {
    desc: 'OpenHarmony',
    ua: 'Mozilla/5.0 (Phone; OpenHarmony 4.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 ArkWeb/4.1.6.1 Mobile',
    expected: { name: 'OpenHarmony', version: '4.1' },
  },
]
