# Data report

Generated 2026-11-12 by `scripts/build-data.ts`. Do not edit by hand.

## Counts

```json
{
  "initials": 22,
  "finals": 36,
  "syllables": 416,
  "syllablesStandard": 412,
  "syllablesSingleSource": 4,
  "toneCells": 1476,
  "toneCellsStandard": 1428,
  "toneCellsNeutralInWord": 19,
  "toneCellsSingleSource": 29,
  "cellsWithCharacter": 1235,
  "cellsWithFallbackWord": 211,
  "charactersUnverified": 33,
  "searchableCharacters": 5411
}
```

## How `verified` is decided

Four independent dictionary sources are compared: CC-CEDICT, and three fields of the Unicode Han Database,
`kXHC1983` (Xiàndài Hànyǔ Cídiǎn), `kTGHZ2013` (Tōngyòng Guīfàn Hànzì Zìdiǎn) and `kHanyuPinlu` (Xiàndài Hànyǔ Pínlǜ Cídiǎn).

- A syllable or tone cell is `verified` when at least two of the four attest it. These are `status: "standard"`.
- `status: "neutral-in-word"`: a neutral-tone reading that CC-CEDICT gives inside a common word (≥ 100 occurrences in SUBTLEX-CH). No second machine-readable source exists for these, so they are shown but `verified: false`.
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

yang5 太阳, yin5 口音, yu5 言语, bao5 宝宝, pai5 招牌, pao5 泡泡, tao5 葡萄, tiao5 苗条, nong5 糊弄, lai5 回来, zai5 自在, ceng5 磨蹭, zhu5 记住, zhuan5 转转, shuo5 说说, rang5 嚷嚷, gang5 刚刚, guang5 逛逛, kan5 看看

Neutral readings found only inside uncommon words were dropped entirely (86): ai5, bang5, bi5, cha5, chai5, chan5, chao5, chi5, chong5, chun5, chuo5, cuo5, dian5, die5, ding5, dong5, dou5, feng5, ga5, gao5, gua5, guai5, gui5, ha5, han5, hui5, hun5, jiao5, kai5, ke5, keng5, ku5, kuang5, lan5, lang5, lao5, leng5, lian5, liao5, liu5, man5, mang5, mou5, nang5, nei5, nen5, nian5, nie5, pa5, pan5, pang5, pen5, pi5, pu5, qiao5, qie5, qiu5, quan5, que5, ran5, sa5, san5, sang5, se5, shan5, she5, shui5, song5, suan5, sui5, ta5, tian5, tie5, tun5, wai5, wen5, wo5, xiang5, yan5, yao5, yuan5, zao5, zhong5, zhuang5, zong5, zuo5

## Tone cells with no example character

Shown cells where nothing common enough exists. Left blank on purpose.

ao3, e1, e5, ei1, ei2, ei3, ei4, eng1, o3, ou4, yong2, yong5, wai3, wang1, weng3, weng4, yue3, yue5, bo3, biao4, bie3, bing5, bu1, bu2, pai3, pang1, pang3, pei1, pen4, po3, pou2, pou3, pian3, ping1, mao3, man1, mang1, mou1, mie1, ming3, fiao4, dao2, dan5, de1, dei1, den4, dia3, diao3, dun3, tai3, tan5, tang5, tei1, teng1, tou3, tie4, tian4, ting4, tui2, tuan1, tuan3, tuan4, tun3, tun4, na1, nao1, nan1, nan3, nang1, nang3, nang4, ne2, ne4, nou4, nie2, niu4, nian1, ning3, nun2, nü4, nü5, la2, lang1, lei5, leng1, leng2, long5, lou1, li1, liao1, lie1, lie3, lin1, lin3, lin4, lu1, lu5, luo1, lun1, lun3, zan1, zan5, zang3, ze4, zen4, zou1, zuo1, zui1, zui5, zuan3, zun3, zun4, ca3, cen1, cen2, ceng1, ci1, cu2, cuo2, cuo3, cui3, cuan1, cuan2, cun3, sao5, seng1, song2, sou3, sou4, suo5, zha5, zhan5, zhou3, zhou5, zhui5, zhuai1, zhuai3, zhun1, zhuang3, cha3, chai3, chai4, chao4, chang1, che5, chen1, chen3, chen5, cheng5, chua1, chuai1, chuai2, chuai3, shai1, shou2, shua4, shui2, shun3, rang2, rong3, rua2, ruo2, rui2, rui3, ruan2, run2, jian5, jiang5, jiong1, jiong3, jue1, jue3, jue4, qia2, qiang4, qin3, qin4, qin5, qun1, xian5, xin2, xin3, xiong4, xu2, ga2, ga3, gai5, gang4, ge3, gen2, gen3, gen4, geng3, gong3, gong5, gu2, kai4, kao1, kei1, ken4, kou1, kou5, kuai3, kuang3, ha2, ha3, ha4, hao1, han1, hang1, hang4, hou1, huang5

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
| `pai5` | 牌 (招牌) | Neutral-tone reading inside a word; attested in CC-CEDICT only. |
| `pao5` | 泡 (泡泡) | Neutral-tone reading inside a word; attested in CC-CEDICT only. |
| `mo5` | 末 (芥末) | Neutral-tone reading inside a word; attested in CC-CEDICT only. |
| `da5` | 搭 (勾搭) | Neutral-tone reading inside a word; attested in CC-CEDICT only. |
| `tao5` | 萄 (葡萄) | Neutral-tone reading inside a word; attested in CC-CEDICT only. |
| `tiao5` | 条 (苗条) | Neutral-tone reading inside a word; attested in CC-CEDICT only. |
| `nong5` | 弄 (糊弄) | Neutral-tone reading inside a word; attested in CC-CEDICT only. |
| `lai5` | 来 (回来) | Neutral-tone reading inside a word; attested in CC-CEDICT only. |
| `zai5` | 在 (自在) | Neutral-tone reading inside a word; attested in CC-CEDICT only. |
| `ceng5` | 蹭 (磨蹭) | Neutral-tone reading inside a word; attested in CC-CEDICT only. |
| `zheng5` | 筝 (风筝) | Neutral-tone reading inside a word; attested in CC-CEDICT only. |
| `zhu5` | 住 (记住) | Neutral-tone reading inside a word; attested in CC-CEDICT only. |
| `zhuan5` | 转 (转转) | Neutral-tone reading inside a word; attested in CC-CEDICT only. |
| `chang5` | 场 (下场) | Neutral-tone reading inside a word; attested in CC-CEDICT only. |
| `chu5` | 出 (出来) | Neutral-tone reading inside a word; attested in CC-CEDICT only. |
| `shuo5` | 说 (说说) | Neutral-tone reading inside a word; attested in CC-CEDICT only. |
| `rang5` | 嚷 (嚷嚷) | Neutral-tone reading inside a word; attested in CC-CEDICT only. |
| `qi5` | 起 (起来) | Neutral-tone reading inside a word; attested in CC-CEDICT only. |
| `qu5` | 去 (回去) | Neutral-tone reading inside a word; attested in CC-CEDICT only. |
| `xing5` | 星 (星星) | Neutral-tone reading inside a word; attested in CC-CEDICT only. |
| `xu5` | 婿 (女婿) | Neutral-tone reading inside a word; attested in CC-CEDICT only. |
| `gang5` | 刚 (刚刚) | Neutral-tone reading inside a word; attested in CC-CEDICT only. |
| `gu5` | 顾 (照顾) | Neutral-tone reading inside a word; attested in CC-CEDICT only. |
| `guang5` | 逛 (逛逛) | Neutral-tone reading inside a word; attested in CC-CEDICT only. |
| `kan5` | 看 (看看) | Neutral-tone reading inside a word; attested in CC-CEDICT only. |
| `he5` | 荷 (薄荷) | Neutral-tone reading inside a word; attested in CC-CEDICT only. |

## Cells using a fallback word

The character does not stand alone as a word with this reading, so a common word carries it.

ang1 肮→肮脏, ang4 盎→盎司, e3 恶→恶心, yi5 意→主意, ye2 爷→爷爷, ye5 爷→爷爷, you5 友→朋友, yan4 验→经验, yang1 央→中央, yang5 阳→太阳, yin5 音→口音, ying5 应→答应, yong1 拥→拥有, wu5 务→任务, wei5 维→恭维, wang5 枉→冤枉, weng1 翁→富翁, yu5 语→言语, yuan1 冤→冤枉, yun3 允→允许, bai5 白→明白, bao5 宝→宝宝, ban5 扮→打扮, bo4 薄→薄荷, bo5 膊→胳膊, bie4 别→别扭, bin4 殡→殡仪馆, bu5 不→对不起, pai5 牌→招牌, pao5 泡→泡泡, peng5 篷→帐篷, po5 婆→婆婆, pou1 剖→解剖, pie3 撇→左撇子, pian2 便→便宜, pin2 频→视频, pin4 聘→聘请, pu2 葡→葡萄, ma2 麻→麻烦, mai5 卖→买卖, mao5 毛→眉毛, mang3 莽→鲁莽, mei5 妹→妹妹, mo5 末→芥末, mou2 谋→阴谋, miu4 谬→荒谬, mian5 面→后面, min3 敏→敏感, ming5 明→聪明, mu5 拇→大拇指, fa4 发→理发, fa5 发→头发, fan5 烦→麻烦, fang3 访→访问, fang5 方→地方, fen5 分→部分, feng3 讽→讽刺, fou3 否→否认, fu3 府→政府, fu5 服→衣服, da5 搭→勾搭, dai5 袋→脑袋, dao5 道→味道, dang5 当→妥当, dei3 得→非得, di5 弟→弟弟, du1 督→监督, du5 度→态度, duo5 朵→耳朵, tai5 太→太太, tao5 萄→葡萄, teng5 腾→折腾, tong5 同→合同, ti3 体→身体, ti5 屉→抽屉, tiao5 条→苗条, ting5 听→打听, tu5 涂→糊涂, tuo4 唾→唾液, tuo5 驼→骆驼, nai4 耐→耐心, nai5 奶→奶奶, nao5 闹→热闹, nan4 难→灾难, nan5 难→困难, nong5 弄→糊弄, nie4 孽→罪孽, niu5 扭→别扭, niang4 酿→酿酒, niang5 娘→姑娘, ning4 宁→宁可, nu3 努→努力, la3 喇→喇叭, lai5 来→回来, lao4 酪→奶酪, long3 笼→笼罩, liao3 了→了解, liang5 亮→漂亮, ling5 灵→机灵, luan2 挛→痉挛, lun4 论→讨论, za1 扎→包扎, zai5 在→自在, zao2 凿→确凿, zan4 赞→赞成, zen3 怎→怎么, zeng1 增→增加, zong4 纵→操纵, zuo2 昨→昨天, zuan4 钻→钻石, cai5 材→棺材, can4 灿→灿烂, ceng5 蹭→磨蹭, cong1 聪→聪明, cun5 寸→尺寸, sa4 萨→比萨, sang3 嗓→嗓子, sou5 嗽→咳嗽, si5 思→意思, su5 诉→告诉, sui3 髓→骨髓, sun3 损→损失, zha2 扎→挣扎, zhao2 着→着急, zhang5 掌→巴掌, zheng5 筝→风筝, zhi5 置→位置, zhu2 逐→逐渐, zhu5 住→记住, zhua3 爪→爪子, zhuo2 着→着想, zhuan5 转→转转, chang5 场→下场, cheng3 逞→得逞, chou5 酬→报酬, chu5 出→出来, chuo4 绰→绰号, sha4 厦→大厦, shao5 少→多少, shang5 上→晚上, she1 奢→奢侈, shen3 审→审判, shen5 神→精神, sheng5 生→先生, shou5 手→帮手, shi5 是→还是, shu5 叔→叔叔, shuo4 烁→闪烁, shuo5 说→说说, rao3 扰→打扰, rang1 嚷→嚷嚷, rang5 嚷→嚷嚷, ren5 人→别人, ru3 辱→侮辱, ji5 计→算计, jia2 颊→脸颊, jia5 甲→指甲, jie5 姐→小姐, jiu5 舅→舅舅, jing5 睛→眼睛, ju1 居→邻居, ju5 矩→规矩, qi5 起→起来, qia4 恰→恰好, qie1 切→切断, qie2 茄→番茄, qie3 且→而且, qian5 钱→价钱, qing4 庆→庆祝, qing5 情→事情, qu2 渠→渠道, qu5 去→回去, xi5 西→东西, xia5 下→坐下, xiao1 消→消息, xiao2 淆→混淆, xie5 谢→谢谢, xin5 心→点心, xing5 星→星星, xiong5 兄→弟兄, xu3 许→也许, xu5 婿→女婿, xuan1 宣→宣布, xun1 勋→勋章, xun5 训→教训, ga4 尬→尴尬, gao4 告→告诉, gang5 刚→刚刚, ge5 个→一个, geng1 更→更换, gu5 顾→照顾, gua3 寡→寡妇, guang5 逛→逛逛, ka1 咖→咖啡, kai3 慨→慷慨, kan5 看→看看, kui2 葵→向日葵, kui3 傀→傀儡, kui4 溃→崩溃, kuai5 快→凉快, kun1 昆→昆虫, hai5 害→厉害, hao5 号→记号, hang2 行→银行, he5 荷→薄荷, hou5 候→时候, hu5 乎→在乎, hua5 话→笑话, huo5 伙→家伙, huan1 欢→欢迎, huan5 欢→喜欢

## Syllables tagged `rare`

No tone has a character within the 4000 most frequent.

ei, eng, bia, biang, fiao, den, dia, tei, nou, nun, cei, cen, sei, seng, chua, rua, jiong, kei
