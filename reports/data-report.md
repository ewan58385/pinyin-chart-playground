# Data report

Generated 2026-11-13 by `scripts/build-data.ts`. Do not edit by hand.

## Counts

```json
{
  "initials": 22,
  "finals": 36,
  "syllables": 416,
  "syllablesStandard": 412,
  "syllablesSingleSource": 4,
  "toneCells": 1469,
  "toneCellsStandard": 1428,
  "toneCellsNeutralInWord": 12,
  "toneCellsSingleSource": 29,
  "cellsWithCharacter": 1230,
  "cellsWithFallbackWord": 378,
  "charactersUnverified": 22,
  "searchableCharacters": 7781
}
```

## How `verified` is decided

Four independent dictionary sources are compared: CC-CEDICT, and three fields of the Unicode Han Database,
`kXHC1983` (Xiàndài Hànyǔ Cídiǎn), `kTGHZ2013` (Tōngyòng Guīfàn Hànzì Zìdiǎn) and `kHanyuPinlu` (Xiàndài Hànyǔ Pínlǜ Cídiǎn).

- A syllable or tone cell is `verified` when at least two of the four attest it. These are `status: "standard"`.
- `status: "neutral-in-word"`: a neutral-tone reading that CC-CEDICT gives inside a common word (an HSK word up to level 6). No second machine-readable source exists for these, so they are shown but `verified: false`.
- `status: "single-source"`: only one source attests it. Kept in the data, hidden on the chart unless "show unverified" is on.
- An example character is `verified` when Unihan confirms that the character has that reading.

## Rare and disputed cells

| Syllable | On chart | Sources | Tones attested | Evidence |
|---|---|---|---|---|
| dia | yes | cedict, tghz, xhc | diǎ | 嗲 |
| lo | yes | cedict, tghz, xhc | lo | 咯 |
| den | yes | cedict, tghz, xhc | dèn | 㩐 扽 |
| rua | yes | cedict, xhc | ruá | 挼 |
| nun | yes | cedict, xhc | nún | 黁 |
| eng | yes | cedict, xhc | ēng | 鞥 |
| ê | no, off-grid (no column for it among the 36 finals) | tghz | 1, 2, 3, 4 | 欸 |
| yo | no, off-grid (no column for it among the 36 finals) | cedict, pinlu, tghz, xhc | 1, 5 | 哎唷 哎哟 唷 哟 喲 |
| o | yes | cedict, pinlu, tghz, xhc | ō, ó, ǒ, ò, o (single-source) | 喔 噢 噢买嘎 哦 嚄 |
| ei | yes | cedict, pinlu, xhc | ēi, éi, ěi, èi | 工口 欸 诶 誒 |
| cei | hidden (single source) | xhc | cèi (single-source) | 𤭢 |
| kei | yes | cedict, tghz, xhc | kēi | 剋 剋架 挨剋 尅 |
| tei | yes | cedict, xhc | tēi | 忒 |
| fiao | yes | cedict, xhc | fiào | 覅 |
| zhei | yes | cedict, xhc | zhèi | 这 这嘎达 这疙瘩 這 |
| shei | yes | cedict, tghz, xhc | shéi | 人谁无过 爱谁谁 花落谁家 谁 谁人乐队 |
| chua | yes | cedict, xhc | chuā | 欻 歘 |
| nou | yes | cedict, tghz, xhc | nòu | 獳 耨 鎒 |
| biang | hidden (single source) | cedict | biáng (single-source) | 𰻝 𰻝𰻝面 |
| bia | hidden (single source) | cedict | biā (single-source) | 吧 |
| sei | hidden (single source) | cedict | séi (single-source) | 没谁了 |

## Off-grid syllables

Attested, but not expressible as one of 22 rows × 36 columns. Not on the chart.

- `ê` tones 1,2,3,4 (tghz): 欸
- `hm` tones 5 (cedict, xhc): 噷
- `hng` tones 5 (cedict, tghz, xhc): 哼
- `m` tones 1,2,4 (cedict, tghz, xhc): 呣 呒 呒啥 呒没 嘸
- `n` tones 2,3,4 (pinlu, xhc): 㕶 嗯 唔 𠮾
- `ng` tones 2,3,4 (pinlu, tghz, xhc): 㕶 嗯 唔 𠮾
- `r` tones 5 (pinlu): 儿 兒
- `yo` tones 1,5 (cedict, pinlu, tghz, xhc): 哎唷 哎哟 唷 哟 喲

## Single-source syllables (hidden by default)

- `bia` (cedict): biā
- `biang` (cedict): biáng
- `cei` (xhc): cèi
- `sei` (cedict): séi

## Single-source tone cells on standard syllables (hidden by default)

| Cell | id | Source | Evidence |
|---|---|---|---|
| án | `an2` | cedict | 啽 |
| en | `en5` | cedict | 嗯 嗯哼 |
| o | `o5` | cedict | 哦 喔 |
| óu | `ou2` | cedict | 吽 吽呀 吽牙 |
| biáo | `biao2` | cedict | 嫑 |
| piè | `pie4` | xhc | 嫳 |
| mi | `mi5` | cedict | 妈咪 密密匝匝 密密实实 密密层层 |
| fóu | `fou2` | cedict | 紑 |
| dè | `de4` | cedict | 嘚 嘚瑟 得 得瑟 |
| duǐ | `dui3` | cedict | 㨃 回怼 怒怼 怼 |
| te | `te5` | xhc | 脦 |
| nuǒ | `nuo3` | cedict | 㛂 |
| lē | `le1` | xhc | 肋 |
| līng | `ling1` | cedict | 昤 |
| lüě | `lüe3` | xhc | 掠 |
| cào | `cao4` | cedict | 我操 我肏 操 操你妈 |
| cǔ | `cu3` | cedict | 皻 |
| suǎn | `suan3` | cedict | 匴 篹 |
| chuì | `chui4` | cedict | 龡 |
| rèng | `reng4` | cedict | 芿 |
| rōng | `rong1` | pinlu | 茸 |
| qiōng | `qiong1` | cedict | 銎 |
| gáng | `gang2` | cedict | 杠杠的 |
| gēi | `gei1` | cedict | 假 假掰 |
| huai | `huai5` | xhc | 划 劃 |

## Neutral-tone cells resting on CC-CEDICT alone (shown, unverified)

yang5 太阳, yin5 口音, yu5 言语, bao5 宝宝, feng5 裁缝, tao5 葡萄, tiao5 苗条, lai5 回来, lao5 姥姥, zai5 自在, zhu5 记住, gang5 刚刚

Neutral readings found only inside uncommon words were dropped entirely (93): ai5, bang5, bi5, ceng5, cha5, chai5, chan5, chao5, chi5, chong5, chun5, chuo5, cuo5, dian5, die5, ding5, dong5, dou5, ga5, gao5, gua5, guai5, guang5, gui5, ha5, han5, hui5, hun5, jiao5, kai5, kan5, ke5, keng5, ku5, kuang5, lan5, lang5, leng5, lian5, liao5, liu5, man5, mang5, mou5, nang5, nei5, nen5, nian5, nie5, nong5, pa5, pai5, pan5, pang5, pao5, pen5, pi5, pu5, qiao5, qie5, qiu5, quan5, que5, ran5, rang5, sa5, san5, sang5, se5, shan5, she5, shui5, shuo5, song5, suan5, sui5, ta5, tian5, tie5, tun5, wai5, wen5, wo5, xiang5, yan5, yao5, yuan5, zao5, zhong5, zhuan5, zhuang5, zong5, zuo5

## Tone cells with no example character

Shown cells where nothing common enough exists. Left blank on purpose.

ang1, ang4, e1, e5, ei1, ei2, ei3, ei4, eng1, o3, ou4, yong2, yong5, wai3, weng3, weng4, yu1, yue3, yue5, bei5, beng3, bo4, biao4, bie3, bin4, bing5, bu1, bu2, pai3, pang3, pen4, po3, pou2, pou3, pie1, pie3, pian3, mao3, man1, mang1, mou1, miao1, mie1, ming3, mu5, fiao4, dao2, de1, dei1, den4, dia3, diao3, dun3, tai3, tang5, tei1, teng1, tou3, tie4, tian4, ting4, tuo5, tuan1, tuan3, tuan4, tun2, tun3, tun4, na1, nao1, nan1, nan3, nang1, nang3, nang4, ne2, ne4, nou4, ni1, nie2, nie4, niu1, niu4, nian1, nian3, ning3, nun2, nü4, la2, lang1, lei1, lei5, leng1, lo5, lou1, lou5, li1, liao1, lin1, lin3, lu1, luo5, lun1, lun3, zan1, zan5, zang3, ze4, zen4, zou1, zuo1, zui1, zuan3, zun3, zun4, ca3, cen1, cen2, ceng1, ceng4, ci1, cu2, cuo2, cuo3, cui3, cuan1, cuan2, cun3, sao5, song2, sou3, sou4, zha5, zhang5, zhou3, zhou5, zhui5, zhuai1, zhuai3, zhun1, zhuang3, cha3, chai3, chai4, chao4, che5, chen1, chen3, chen5, cheng5, chua1, chuo1, chuai1, chuai2, chuai4, shou2, shua4, shui2, shun3, rang1, rang2, rua2, ruo2, rui2, rui3, ruan2, run2, jiao2, jian5, jiang5, jiong1, jue1, jue3, jue4, qia2, qiu3, qin4, qin5, qun1, xian5, xin2, xin3, xiong4, xiong5, ga1, ga2, ga3, gai5, ge3, gen3, gen4, gong5, gu2, kai4, kao1, kei1, ken4, kou1, kou5, kua3, kui3, kuai3, kuang3, ha2, ha3, ha4, hao1, hang1, hang4, hou1, huang5

## Example characters marked unverified

| Cell | Character | Reason |
|---|---|---|
| `en1` | 嗯 | Reading for this character attested in CC-CEDICT only. |
| `en4` | 嗯 | Reading for this character attested in CC-CEDICT only. |
| `yang5` | 阳 (太阳) | Neutral-tone reading inside a word; attested in CC-CEDICT only. |
| `yin5` | 音 (口音) | Neutral-tone reading inside a word; attested in CC-CEDICT only. |
| `wei5` | 维 (恭维) | Neutral-tone reading inside a word; attested in CC-CEDICT only. |
| `yu5` | 语 (言语) | Neutral-tone reading inside a word; attested in CC-CEDICT only. |
| `bao5` | 宝 (宝宝) | Neutral-tone reading inside a word; attested in CC-CEDICT only. |
| `feng5` | 缝 (裁缝) | Neutral-tone reading inside a word; attested in CC-CEDICT only. |
| `tao5` | 萄 (葡萄) | Neutral-tone reading inside a word; attested in CC-CEDICT only. |
| `tiao5` | 条 (苗条) | Neutral-tone reading inside a word; attested in CC-CEDICT only. |
| `lai5` | 来 (回来) | Neutral-tone reading inside a word; attested in CC-CEDICT only. |
| `lao5` | 姥 (姥姥) | Neutral-tone reading inside a word; attested in CC-CEDICT only. |
| `zai5` | 在 (自在) | Neutral-tone reading inside a word; attested in CC-CEDICT only. |
| `zhan5` | 战 (冷战) | Neutral-tone reading inside a word; attested in CC-CEDICT only. |
| `zheng5` | 筝 (风筝) | Neutral-tone reading inside a word; attested in CC-CEDICT only. |
| `zhu5` | 住 (记住) | Neutral-tone reading inside a word; attested in CC-CEDICT only. |
| `qu5` | 去 (回去) | Neutral-tone reading inside a word; attested in CC-CEDICT only. |
| `xing5` | 星 (星星) | Neutral-tone reading inside a word; attested in CC-CEDICT only. |
| `xu5` | 婿 (女婿) | Neutral-tone reading inside a word; attested in CC-CEDICT only. |
| `gang5` | 刚 (刚刚) | Neutral-tone reading inside a word; attested in CC-CEDICT only. |
| `gu5` | 顾 (照顾) | Neutral-tone reading inside a word; attested in CC-CEDICT only. |
| `he5` | 合 (凑合) | Neutral-tone reading inside a word; attested in CC-CEDICT only. |

## Cells using a fallback word

The character does not stand alone as a word with this reading, so a common word carries it.

ai2 癌→癌症, ao1 凹→凹凸, ao4 傲→骄傲, ang2 昂→昂贵, e2 额→余额, e3 恶→恶心, er3 耳→耳朵, ou1 殴→殴打, ou3 偶→偶尔, yi5 意→主意, ya3 哑→聋哑, ya4 讶→惊讶, ye1 椰→椰子, ye2 爷→爷爷, ye5 爷→爷爷, you1 优→优势, you5 友→朋友, yan4 验→体验, yang1 央→中央, yang5 阳→太阳, yin5 音→口音, ying3 影→电影, ying5 应→答应, yong1 拥→拥抱, yong3 永→永远, wu1 屋→屋子, wu5 务→任务, wa2 娃→娃娃, wa3 瓦→瓦解, wa4 袜→袜子, wei1 危→危害, wei3 伟→伟大, wei5 维→恭维, wen1 温→气温, wang1 汪→汪洋, wang5 枉→冤枉, weng1 翁→富翁, yu5 语→言语, yuan1 冤→冤枉, yun3 允→允许, bai5 白→明白, bao5 宝→宝宝, ban5 扮→打扮, bang3 膀→翅膀, ben1 奔→奔波, beng1 崩→崩溃, bo1 播→传播, bo2 伯→伯母, bo3 簸→颠簸, bo5 膊→胳膊, bi2 鼻→鼻子, biao1 标→标准, bie4 别→别扭, bin1 宾→宾馆, bu5 不→对不起, pao2 袍→旗袍, pan1 攀→攀登, pang1 乓→乒乓球, pei1 胚→胚胎, peng1 烹→烹饪, peng2 朋→朋友, peng5 篷→帐篷, po2 婆→老婆, po5 泼→活泼, pou1 剖→解剖, pi4 辟→开辟, pian2 便→便宜, pin2 贫→贫乏, pin4 聘→应聘, ping1 乒→乒乓球, pu2 葡→葡萄, pu3 普→普通, ma2 麻→麻烦, mai5 卖→买卖, mao5 毛→眉毛, man2 馒→馒头, mang3 莽→鲁莽, me5 么→什么, mei5 妹→妹妹, men4 闷→沉闷, mo3 抹→抹杀, mo5 磨→琢磨, mou2 谋→参谋, miao2 苗→苗条, miu4 谬→荒谬, mian5 面→后面, min2 民→人民, min3 敏→敏感, ming5 明→聪明, mu2 模→模样, fa4 发→理发, fa5 发→头发, fan5 烦→麻烦, fang3 访→访问, fang5 方→地方, fei3 匪→匪徒, fen2 坟→坟墓, fen5 分→部分, feng3 讽→讽刺, feng4 奉→奉献, feng5 缝→裁缝, fou3 否→否定, fu1 夫→夫妻, fu3 府→政府, fu5 服→衣服, da5 瘩→疙瘩, dai3 歹→歹徒, dai5 袋→脑袋, dao5 道→味道, dan5 丹→牡丹, dang5 当→妥当, dei3 得→非得, dou3 抖→发抖, di2 敌→敌人, di5 弟→弟弟, die2 叠→重叠, dian1 颠→颠倒, du1 都→首都, du5 度→态度, duo4 堕→堕落, duo5 朵→耳朵, tai1 胎→轮胎, tai5 太→太太, tao3 讨→讨论, tao5 萄→葡萄, tan1 滩→沙滩, tan3 坦→坦率, tan4 叹→叹气, tan5 弹→动弹, teng5 腾→折腾, tong5 同→合同, ti3 体→身体, ti5 屉→抽屉, tiao5 条→苗条, ting5 听→打听, tu5 涂→糊涂, tuo3 妥→妥协, tuo4 唾→唾沫, tui2 颓→颓废, nai4 耐→耐心, nai5 奶→奶奶, nao2 挠→阻挠, nao3 脑→电脑, nao5 闹→热闹, nan4 难→灾难, nan5 难→困难, nang2 囊→胶囊, nei3 馁→气馁, ni4 腻→油腻, niao4 尿→糖尿病, niu5 扭→别扭, niang2 娘→新娘, niang4 酿→酝酿, niang5 娘→姑娘, ning4 宁→宁可, nu2 奴→奴隶, nu3 努→努力, nu4 怒→愤怒, nuo4 诺→承诺, nü5 女→闺女, nüe4 虐→虐待, la3 喇→喇叭, lai5 来→回来, lao5 姥→姥姥, lang3 朗→晴朗, lang4 浪→浪费, leng2 棱→棱角, long3 拢→靠拢, long5 窿→窟窿, li5 里→那里, liao3 了→了解, lie1 咧→大大咧咧, lie3 咧→咧嘴, liu3 柳→柳树, liang5 量→商量, lin4 吝→吝啬, ling5 灵→机灵, lu2 炉→炉灶, lu3 虏→俘虏, lu5 芦→糖葫芦, luo1 啰→啰唆, luo2 逻→逻辑, luo3 裸→裸露, luan2 孪→孪生, lun4 论→讨论, lü3 旅→旅客, lüe4 略→侵略, za1 扎→包扎, zai5 在→自在, zao2 凿→确凿, zan4 赞→称赞, zen3 怎→怎么, zeng1 增→增加, zong1 综→综合, zong4 纵→操纵, zi1 资→工资, zuo2 昨→昨天, zui5 罪→得罪, zuan4 钻→钻石, zun1 尊→尊重, cai5 材→棺材, cao1 操→体操, cao2 嘈→嘈杂, can2 残→残疾, can4 灿→灿烂, cong1 聪→聪明, cou4 凑→凑合, cun5 寸→尺寸, sa4 萨→菩萨, sao1 骚→牢骚, sao4 臊→害臊, sang1 桑→桑拿, sang3 嗓→嗓子, sang4 丧→丧失, sen1 森→森林, seng1 僧→僧人, sou5 嗽→咳嗽, si5 思→意思, su1 苏→复苏, su2 俗→风俗, su4 速→快速, su5 诉→告诉, suo1 缩→缩小, suo5 嗦→哆嗦, sui3 髓→精髓, sun1 孙→孙女, sun3 损→损失, zha2 扎→挣扎, zhai2 宅→住宅, zhao2 着→着急, zhan3 展→发展, zhan5 战→冷战, zhen3 枕→枕头, zheng5 筝→风筝, zhou2 轴→车轴, zhou4 宙→宇宙, zhi5 置→位置, zhu2 逐→逐步, zhu5 住→记住, zhua3 爪→爪子, zhuo2 着→沉着, zhui4 缀→点缀, chai2 柴→火柴, chan4 颤→颤抖, chang1 昌→昌盛, chang5 敞→宽敞, che3 扯→牵扯, che4 彻→彻底, cheng3 逞→逞强, chong3 宠→宠物, chou5 酬→应酬, chi4 翅→翅膀, chu5 楚→清楚, chuo4 绰→绰号, chuai3 揣→揣摩, chuan3 喘→喘气, chun3 蠢→愚蠢, chuang1 窗→窗台, chuang4 创→创业, sha4 厦→大厦, shai1 筛→筛选, shai3 色→本色, shao5 少→多少, shang5 上→地上, she1 奢→奢侈, she3 舍→舍得, shen3 审→审判, shen4 甚→甚至, shen5 神→精神, sheng2 绳→绳子, sheng5 生→先生, shou5 手→把手, shi5 是→还是, shu5 叔→叔叔, shuo4 烁→闪烁, shuan1 栓→血栓, rao2 饶→饶恕, rao3 扰→打扰, ran2 然→忽然, re3 惹→惹祸, ren5 人→别人, rong2 容→内容, rong3 冗→冗长, ru3 乳→哺乳, rui4 锐→尖锐, run4 润→湿润, ji5 记→书记, jia2 颊→脸颊, jia5 家→人家, jie5 姐→姐姐, jiu1 究→研究, jiu5 究→讲究, jing5 睛→眼睛, jiong3 窘→窘迫, ju1 居→邻居, ju5 矩→规矩, jun1 军→亚军, jun4 峻→严峻, qi5 气→力气, qia3 卡→卡子, qia4 恰→恰好, qie1 切→切割, qie2 茄→番茄, qie3 且→而且, qian5 钱→价钱, qiang4 呛→够呛, qin3 寝→寝室, qing4 庆→庆祝, qing5 情→事情, qu2 渠→渠道, qu5 去→回去, xi2 习→学习, xi5 西→东西, xia5 下→坐下, xiao1 消→取消, xiao2 淆→混淆, xie5 谢→谢谢, xiu3 朽→腐朽, xin5 心→点心, xing5 星→星星, xu2 徐→徐徐, xu3 许→也许, xu4 续→手续, xu5 婿→女婿, xue1 削→削弱, xuan1 宣→宣传, xuan4 炫→炫耀, xun1 熏→熏陶, xun2 寻→寻找, xun4 训→训练, xun5 训→教训, ga4 尬→尴尬, gao4 告→告诉, gang3 岗→岗位, gang4 杠→杠杆, gang5 刚→刚刚, ge5 哥→哥哥, geng1 耕→耕地, geng3 耿→耿直, gong3 巩→巩固, gu1 姑→姑娘, gu5 顾→照顾, gua3 寡→寡妇, guo3 果→水果, ka1 咖→咖啡, kai3 慨→感慨, kan1 看→看管, kang1 康→健康, kang4 抗→抗议, kong4 控→控制, kui2 魁→夺魁, kui4 愧→惭愧, kuai5 快→凉快, kuan3 款→付款, kun1 昆→昆虫, kun3 捆→捆绑, hai5 害→厉害, hao2 毫→毫升, hao5 号→记号, han1 酣→酣畅, hang2 行→银行, he4 贺→祝贺, he5 合→凑合, hen2 痕→痕迹, hong4 哄→起哄, hou5 候→时候, hu1 忽→忽然, hu5 乎→在乎, hua5 话→笑话, huo1 豁→豁出去, huo5 和→暖和, huai2 怀→怀念, huan1 欢→欢迎, huan3 缓→缓解, huan5 欢→喜欢, hun2 浑→浑身, huang3 恍→恍然大悟, huang4 晃→摇晃

## Syllables tagged `rare`

No tone has an example character among the 8,105 standard characters (kTGHZ2013).

ei, eng, bia, biang, pie, fiao, den, dia, tei, nou, nun, lo, cei, cen, sei, chua, rua, kei

## Curation check

Each rejection in `scripts/curation.ts`, and whether the automatic choice would otherwise pick that character.

`e1` 阿: still needed, `e2` 哦: still needed, `bo2` 薄: still needed, `pen4` 喷: still needed, `la2` 拉: still needed, `zuo1` 作: still needed, `ci1` 刺: still needed, `shua4` 刷: still needed, `jia2` 夹: still needed, `ge3` 合: still needed, `ha3` 哈: still needed, `diao3` 鸟: still needed, `ma2` 嘛: still needed, `gong5` 公: still needed
