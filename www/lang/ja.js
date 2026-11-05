// Japanese: the word first, then its reading in Latin letters after a '|'. Phrases are split into words with spaces so they can be built from tiles.
LangData.add({ id: 'ja', name: 'Japanese', native: '日本語', tts: 'ja-JP', roman: true, articles: [], note: 'Hiragana first, with the sound written out',
  words: {
    greet: 'こんにちは|konnichiwa;さようなら|sayounara;おはよう|ohayou;おやすみ|oyasumi;ようこそ|youkoso;おねがいします|onegai shimasu;ありがとう|arigatou;どういたしまして|douitashimashite;ごめんなさい|gomennasai;すみません|sumimasen;はい|hai;いいえ|iie',
    basics: 'わたし|watashi;あなた|anata;かれ|kare;かのじょ|kanojo;わたしたち|watashitachi;かれら|karera;と|to;でも|demo;いっしょに|issho ni;おおきい|ookii;ちいさい|chiisai;いい|ii',
    numbers: 'いち|ichi;に|ni;さん|san;よん|yon;ご|go;ろく|roku;なな|nana;はち|hachi;きゅう|kyuu;じゅう|juu;にじゅう|nijuu;ひゃく|hyaku',
    food: 'みず|mizu;パン|pan;ぎゅうにゅう|gyuunyuu;コーヒー|koohii;おちゃ|ocha;りんご|ringo;ごはん|gohan;にく|niku;さかな|sakana;たまご|tamago;チーズ|chiizu;スープ|suupu',
    family: 'はは|haha;ちち|chichi;いもうと|imouto;おとうと|otouto;むすめ|musume;むすこ|musuko;ともだち|tomodachi;おとこのひと|otoko no hito;おんなのひと|onna no hito;こども|kodomo;かぞく|kazoku;あかちゃん|akachan',
    places: 'いえ|ie;とし|toshi;がっこう|gakkou;ホテル|hoteru;くうこう|kuukou;えき|eki;みち|michi;レストラン|resutoran;みせ|mise;びょういん|byouin;ビーチ|biichi;トイレ|toire',
    verbs: 'たべる|taberu;のむ|nomu;いく|iku;ほしい|hoshii;もつ|motsu;みる|miru;はなす|hanasu;あいする|aisuru;よむ|yomu;かく|kaku;ねる|neru;はたらく|hataraku',
    time: 'きょう|kyou;あした|ashita;きのう|kinou;いま|ima;ひ|hi;よる|yoru;しゅうかん|shuukan;あか|aka;あお|ao;みどり|midori;しろ|shiro;くろ|kuro',
  },
  phrases: {
    greet: 'おげんき ですか|ogenki desu ka;げんき です ありがとう|genki desu arigatou;わたしの なまえは アンナ です|watashi no namae wa anna desu;はじめまして|hajimemashite;また あした|mata ashita',
    basics: 'わたしは がくせい です|watashi wa gakusei desu;かのじょは わたしの ともだち です|kanojo wa watashi no tomodachi desu;わたしたちは うれしい です|watashitachi wa ureshii desu;えいごを はなせます か|eigo o hanasemasu ka;わたしは わかりません|watashi wa wakarimasen',
    numbers: 'わたしは おとうとが ふたり います|watashi wa otouto ga futari imasu;わたしは りんごが みっつ ほしい です|watashi wa ringo ga mittsu hoshii desu;ひとが よにん います|hito ga yonin imasu;わたしは にじゅっさい です|watashi wa nijussai desu;わたしは ねこが いっぴき います|watashi wa neko ga ippiki imasu',
    food: 'みずが ほしい です|mizu ga hoshii desu;わたしは コーヒーが すき です|watashi wa koohii ga suki desu;パンは おいしい です|pan wa oishii desu;わたしたちは ごはんを たべます|watashitachi wa gohan o tabemasu;おちゃは いかが ですか|ocha wa ikaga desu ka',
    family: 'わたしの ははは やさしい です|watashi no haha wa yasashii desu;わたしの ちちは よく はたらきます|watashi no chichi wa yoku hatarakimasu;わたしは かぞくが だいすき です|watashi wa kazoku ga daisuki desu;おんなのひとは こどもが います|onna no hito wa kodomo ga imasu;かれは わたしの おとうと です|kare wa watashi no otouto desu',
    places: 'トイレは どこ ですか|toire wa doko desu ka;わたしは がっこうへ いきます|watashi wa gakkou e ikimasu;ホテルは ちかい です|hoteru wa chikai desu;わたしは おおきい とし に すんでいます|watashi wa ookii toshi ni sunde imasu;えきへ どう いきますか|eki e dou ikimasu ka',
    verbs: 'わたしは パンを たべます|watashi wa pan o tabemasu;かのじょは みずを のみます|kanojo wa mizu o nomimasu;わたしたちは ビーチへ いきます|watashitachi wa biichi e ikimasu;わたしは よむのが すき です|watashi wa yomu no ga suki desu;かれは よく ねます|kare wa yoku nemasu',
    time: 'わたしは きょう はたらきます|watashi wa kyou hatarakimasu;あした わたしは よく ねます|ashita watashi wa yoku nemasu;いえは しろい です|ie wa shiroi desu;そらは あおい です|sora wa aoi desu;よる わたしは よみます|yoru watashi wa yomimasu',
  },
  extra: [{ id: 'kana', title: 'Hiragana', size: 6, words: [['あ', 'a'], ['い', 'i'], ['う', 'u'], ['え', 'e'], ['お', 'o'], ['か', 'ka'], ['き', 'ki'], ['く', 'ku'], ['け', 'ke'], ['こ', 'ko'], ['さ', 'sa'], ['し', 'shi'], ['す', 'su'], ['せ', 'se'], ['そ', 'so'], ['た', 'ta'], ['ち', 'chi'], ['つ', 'tsu'], ['て', 'te'], ['と', 'to'], ['な', 'na'], ['に', 'ni'], ['ぬ', 'nu'], ['ね', 'ne'], ['の', 'no'], ['は', 'ha'], ['ひ', 'hi'], ['ふ', 'fu'], ['へ', 'he'], ['ほ', 'ho'], ['ま', 'ma'], ['み', 'mi'], ['む', 'mu'], ['め', 'me'], ['も', 'mo'], ['や', 'ya'], ['ゆ', 'yu'], ['よ', 'yo'], ['ら', 'ra'], ['り', 'ri'], ['る', 'ru'], ['れ', 're'], ['ろ', 'ro'], ['わ', 'wa'], ['を', 'wo'], ['ん', 'n']] }],
});
