// Korean: the word first, then its sound in Latin letters after a '|'. Phrases are split into words with spaces so they can be built from tiles.
LangData.add({ id: 'ko', name: 'Korean', native: '한국어', tts: 'ko-KR', roman: true, articles: [], note: 'Hangul first, with the sound written out',
  words: {
    greet: '안녕하세요|annyeonghaseyo;안녕히 가세요|annyeonghi gaseyo;좋은 아침|joeun achim;안녕히 주무세요|annyeonghi jumuseyo;환영합니다|hwanyeonghamnida;제발|jebal;감사합니다|gamsahamnida;천만에요|cheonmaneyo;죄송합니다|joesonghamnida;실례합니다|sillyehamnida;네|ne;아니요|aniyo',
    basics: '저|jeo;너|neo;그|geu;그녀|geunyeo;우리|uri;그들|geudeul;그리고|geurigo;하지만|hajiman;함께|hamkke;큰|keun;작은|jageun;좋은|joeun',
    numbers: '일|il;이|i;삼|sam;사|sa;오|o;육|yuk;칠|chil;팔|pal;구|gu;십|sip;이십|isip;백|baek',
    food: '물|mul;빵|ppang;우유|uyu;커피|keopi;차|cha;사과|sagwa;밥|bap;고기|gogi;생선|saengseon;계란|gyeran;치즈|chijeu;국|guk',
    family: '어머니|eomeoni;아버지|abeoji;누나|nuna;형|hyeong;딸|ttal;아들|adeul;친구|chingu;남자|namja;여자|yeoja;아이|ai;가족|gajok;아기|agi',
    places: '집|jip;도시|dosi;학교|hakgyo;호텔|hotel;공항|gonghang;기차역|gichayeok;길|gil;식당|sikdang;가게|gage;병원|byeongwon;해변|haebyeon;화장실|hwajangsil',
    verbs: '먹다|meokda;마시다|masida;가다|gada;원하다|wonhada;있다|itda;보다|boda;말하다|malhada;사랑하다|saranghada;읽다|ikda;쓰다|sseuda;자다|jada;일하다|ilhada',
    time: '오늘|oneul;내일|naeil;어제|eoje;지금|jigeum;낮|nat;밤|bam;주|ju;빨강|ppalgang;파랑|parang;초록|chorok;하양|hayang;검정|geomjeong',
  },
  phrases: {
    greet: '어떻게 지내세요|eotteoke jinaeseyo;잘 지내요 감사합니다|jal jinaeyo gamsahamnida;제 이름은 안나예요|je ireumeun annayeyo;만나서 반갑습니다|mannaseo bangapseumnida;내일 봐요|naeil bwayo',
    basics: '저는 학생이에요|jeoneun haksaengieyo;그녀는 제 친구예요|geunyeoneun je chinguyeyo;우리는 행복해요|urineun haengbokaeyo;영어 할 수 있어요|yeongeo hal su isseoyo;저는 이해하지 못해요|jeoneun ihaehaji motaeyo',
    numbers: '저는 형제가 두 명 있어요|jeoneun hyeongjega du myeong isseoyo;저는 사과 세 개를 원해요|jeoneun sagwa se gaereul wonhaeyo;네 사람이 있어요|ne sarami isseoyo;저는 스무 살이에요|jeoneun seumu sarieyo;저는 고양이가 한 마리 있어요|jeoneun goyangiga han mari isseoyo',
    food: '저는 물을 원해요|jeoneun mureul wonhaeyo;저는 커피를 좋아해요|jeoneun keopireul joahaeyo;빵이 맛있어요|ppangi masisseoyo;우리는 밥을 먹어요|urineun babeul meogeoyo;차 드실래요|cha deusillaeyo',
    family: '제 어머니는 친절해요|je eomeonineun chinjeolhaeyo;제 아버지는 일을 많이 해요|je abeojineun ireul mani haeyo;저는 가족을 사랑해요|jeoneun gajogeul saranghaeyo;여자에게 아이가 있어요|yeojaege aiga isseoyo;그는 제 형이에요|geuneun je hyeongieyo',
    places: '화장실이 어디예요|hwajangsiri eodiyeyo;저는 학교에 가요|jeoneun hakgyoe gayo;호텔이 가까워요|hoteri gakkawoyo;저는 큰 도시에 살아요|jeoneun keun dosie sarayo;역에 어떻게 가요|yeoge eotteoke gayo',
    verbs: '저는 빵을 먹어요|jeoneun ppangeul meogeoyo;그녀는 물을 마셔요|geunyeoneun mureul masyeoyo;우리는 해변에 가요|urineun haebyeone gayo;저는 읽는 것을 좋아해요|jeoneun ingneun geoseul joahaeyo;그는 잠을 많이 자요|geuneun jameul mani jayo',
    time: '저는 오늘 일해요|jeoneun oneul ilhaeyo;내일 저는 잠을 많이 자요|naeil jeoneun jameul mani jayo;집이 하얘요|jibi hayaeyo;하늘이 파래요|haneuri paraeyo;밤에 저는 읽어요|bame jeoneun ilgeoyo',
  },
  extra: [{ id: 'hangul', title: 'Hangul', size: 6, words: [['ㅏ', 'a'], ['ㅑ', 'ya'], ['ㅓ', 'eo'], ['ㅕ', 'yeo'], ['ㅗ', 'o'], ['ㅛ', 'yo'], ['ㅜ', 'u'], ['ㅠ', 'yu'], ['ㅡ', 'eu'], ['ㅣ', 'i'], ['ㄱ', 'g'], ['ㄴ', 'n'], ['ㄷ', 'd'], ['ㄹ', 'r'], ['ㅁ', 'm'], ['ㅂ', 'b'], ['ㅅ', 's'], ['ㅇ', 'ng'], ['ㅈ', 'j'], ['ㅊ', 'ch'], ['ㅋ', 'k'], ['ㅌ', 't'], ['ㅍ', 'p'], ['ㅎ', 'h']] }],
});
