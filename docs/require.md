需求本身：

1. 基于输入的 影视类关键字 检索内容后，将其中的1条 ,这一条需要稍微分析下 ，添加到 网盘存储中 目标目录是 
   1. 我的资源/2025/电影
   2. 我的资源/2025/电视剧
2. 需要 通过 tmdb  去识别 这是 电影还是电视剧 ，存储到不同的目录
3. 项目使用 pdm 构建
4. 依赖的库是 BaiduPCS-Py 
5. 我会提供一个完整的cookie里面会有 bduss，和cookie 所有的内容，你需要拆解提供使用
6. 项目只有 main.py 一个文件 
7. cookie 在 cookie.txt 中
8. tmdb api key： 04f3d954e65c4598b6863fee20fff697


技术一些细节：

1. 搜索apidemo：



curl 'https://so.252035.xyz/api/search' \
  -H 'accept: application/json, text/plain, */*' \
  -H 'accept-language: zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7,vi;q=0.6' \
  -H 'cache-control: no-cache' \
  -H 'content-type: application/json' \
  -H 'origin: https://so.252035.xyz' \
  -H 'pragma: no-cache' \
  -H 'priority: u=1, i' \
  -H 'referer: https://so.252035.xyz/' \
  -H 'sec-ch-ua: "Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "macOS"' \
  -H 'sec-fetch-dest: empty' \
  -H 'sec-fetch-mode: cors' \
  -H 'sec-fetch-site: same-origin' \
  -H 'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36' \
  --data-raw '{"kw":"凡人修仙","src":"tg","cloud_types":["baidu"]}'


   response:

   {"code":0,"message":"success","data":{"total":4,"merged_by_type":{"baidu":[{"url":"https://pan.baidu.com/s/1xislAB-xQ3LThh2TTwX2jA?pwd=mr85","password":"mr85","note":"凡人修仙传/凡人 真人版 /凡人修仙 剧场版 (2025)  【更新EP26 4K】 【杨洋/古装】","datetime":"2025-08-11T11:34:51Z","source":"tg:leoziyuan","images":["https://cdn1.telesco.pe/file/QXUw_z4NFC0uipyEJkRXsExcMI3Y8ykhuqyV2r8L55rM_ebsf5rFFKWE29d8klHPy5CP1qHFQ0KPncnDfM6VUO2UFh2oFH7zmdTJXdXqimy_g4k9ThjG8OATbtIRLU80s0wmjqVd7SDAx0grN_7ob20rqxZgANLXa_VNbnot11O9C1CemtjBTdg__FgvXDS90w4Ot4rZbpbE4urlU43ncj6i_4-e27T-rj2rBwg5bgKF8-qNZqFursvhOkGbonRn2j54lWIZdsaS2Ilf4cApuiKQ_mf7ei2yfuGowlkWOqS1oeOr329Tvl_oitosgHPdcBHMqgVNcyx25dmxeaFtoQ.jpg"]},{"url":"https://pan.baidu.com/s/1PjFh_FQeTbfTILfSIQBMiA?pwd=36e5","password":"36e5","note":"凡人修仙传/凡人 真人版 /凡人修仙 剧场版 (2025)  【更新EP25 4K】 【杨洋/古装】描述：　又名: The Immortal Ascension 　该剧改编自忘语的同名小说，讲述了普通的山村穷小子韩立(杨洋 饰)，偶然之下，跨入到一个江湖小门派，虽然资质平庸，但依靠自身努力和合理算计最后修炼成仙的故事。","datetime":"2025-08-10T07:02:16Z","source":"tg:yydf_hzl","images":["https://cdn5.telesco.pe/file/GfebICcRyqpLg1itI1HZ-L0Ep5U1_Z6jdBxYv-eqzH5dl77KIqblCgyvBu4ywxlOAlK0n8n9JU-wLkcdC6D2CrUUUhV1_YUAJnuasxCkbD_-HvBRv0x-O1v5yA90a242sh-WDhOLFe-is6_0fvJ9WEcMbQ0xw3PeZf7eh0fZDUGenaVQBYuXLChK_s3Y8kYlDcZjTVwZhtBXwGIZENVG5sE2sVqAStPdzACgaKe85mG27hdpybAz1c8tZzIL2b-tmOZiGND_mTzoACSlVgDbRPkwqaxXNlI7az_m8TuitB3F_PsY1T1Mq7mNFN3K5fMIylDsnJC9Ls4AInuDWxUIgA.jpg"]},{"url":"https://pan.baidu.com/s/195Uybd2U3pcFDGXmzubdaQ?pwd=mdg4","password":"mdg4","note":"凡人修仙传/凡人 真人版 /凡人修仙 剧场版 (2025)  【更新EP22 4K】 【杨洋/古装】描述：　又名: The Immortal Ascension 　该剧改编自忘语的同名小说，讲述了普通的山村穷小子韩立(杨洋 饰)，偶然之下，跨入到一个江湖小门派，虽然资质平庸，但依靠自身努力和合理算计最后修炼成仙的故事。","datetime":"2025-08-07T06:00:52Z","source":"tg:yydf_hzl","images":["https://cdn1.telesco.pe/file/qDCLjANx1oTRRat3Bx7Oa1SofYzRjj6WmwMxkbYMldfqei_QN_oSqmHTglOEqzN8MlBCdOjXVFoA0OJziC0wyPPxfSPWY63j0oDmDLV97RO8wBSRWVRW6iBt8W1SjCjkdpKJnVe7ly6ElkXWpsZ1Y4LEPWOhdlUsKESCLxMKpZ--ZDXPA1shiyFEEm91x8VVo8lCg_tG1uk4PDqi6vD4GiVuRllnoWBK6uByuO_WuwqxpjSm8OpU_rFncp3WvA8-iOZh8xBcI5SfFckh-NrWO9UQftBu7Uhft_bmYsjB6xO793HCvzVGiupOc4TEuaenF8MXX8G4Rwybm3idKd5-kg.jpg"]},{"url":"https://pan.baidu.com/s/1MxusApfbhufnmMA4cXggAQ?pwd=k814","password":"k814","note":"凡人修仙传/凡人 真人版 /凡人修仙 剧场版 (2025)  【更新EP19 4K】 【杨洋/古装】描述：　又名: The Immortal Ascension 　该剧改编自忘语的同名小说，讲述了普通的山村穷小子韩立(杨洋 饰)，偶然之下，跨入到一个江湖小门派，虽然资质平庸，但依靠自身努力和合理算计最后修炼成仙的故事。","datetime":"2025-08-05T07:21:10Z","source":"tg:leoziyuan","images":["https://cdn1.telesco.pe/file/SGMxOCJK4nsY3Z73y2xpDXvs2RWVJuXbaxd0QE9TUE7a17pKt949sZ6Q8bYhr3x32zMUdJd33HccLbcttpCpPL57ToFFE8gp3T_mVuAPerKbb2ZmH1yx8T2l5NC5chMvHHj0WoV5YKeh7NWBGEBSxLAUbG2mhU5yMeLP9ChoHUihPexQH3ZEflH5w6cPq6MfuqgahirjfOK2RhMndiCbxpYABjz_x_CK5jFvXOxsjFzmPVvGzkJ71Bp1ApGWZhkpKnipJir2SP229zv5sA58uKiQFeMm5a9NQ24Jn5RclzLLj2Ra84yiOlutEhyaIioKrXBquAYFZq79QCsU52JNbQ.jpg"]}]}}}