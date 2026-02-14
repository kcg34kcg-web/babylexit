// src/data.ts

export type Article = {
    id: number;
    category: "Hukuk" | "Felsefe" | "Psikoloji" | "Teknoloji" | "Paradoks" | "Bilim" | "Tarih";
    title: string;
    subtitle: string;
    readTime: string;
    content: string;
  };
  
  export const ARTICLE_DATA: Article[] = [
    // --- HUKUK (1-12) ---
    {
      id: 1,
      category: "Hukuk",
      title: "Mağara Kaşifleri",
      subtitle: "Yamyamlık mı, Zorunluluk mu?",
      readTime: "45 sn",
      content: `<p>Mağarada mahsur kalan kaşifler, açlıktan ölmemek için kura ile bir arkadaşlarını yerler. Kurtarıldıklarında cinayetle yargılanırlar. Yasa 'öldürme' der, ama hayatta kalma içgüdüsü yasadan üstün müdür?</p>`
    },
    {
      id: 2,
      category: "Hukuk",
      title: "Zehirli Ağacın Meyvesi",
      subtitle: "Hukuka Aykırı Delil",
      readTime: "40 sn",
      content: `<p>Polis, izinsiz bir arama (zehirli ağaç) sonucu cinayet silahını (meyve) bulursa, bu silah mahkemede delil sayılamaz. Suçlu serbest kalsa bile devlet hukuka uymalıdır.</p>`
    },
    {
      id: 3,
      category: "Hukuk",
      title: "Miranda Hakları",
      subtitle: "Sessiz Kalma Hakkı",
      readTime: "35 sn",
      content: `<p>Ernesto Miranda, hakları okunmadığı için itirafı geçersiz sayıldı ve serbest kaldı. O günden sonra polisler tutuklarken 'Sessiz kalma hakkına sahipsiniz' demek zorundadır.</p>`
    },
    {
      id: 4,
      category: "Hukuk",
      title: "Mücbir Sebep",
      subtitle: "Kontrol Dışı Olaylar",
      readTime: "30 sn",
      content: `<p>Bir sözleşmeyi deprem, savaş veya salgın yüzünden yerine getiremezseniz sorumlu tutulmazsınız. Ancak 'para bitmesi' bir mücbir sebep değildir.</p>`
    },
    {
      id: 5,
      category: "Hukuk",
      title: "Masumiyet Karinesi",
      subtitle: "Aksi İspatlanana Kadar",
      readTime: "40 sn",
      content: `<p>Bir kişi herkesin gözü önünde suç işlese bile, mahkeme kararı kesinleşene kadar 'suçlu' değil, 'sanık'tır. Medya yargısı hukukun en büyük düşmanıdır.</p>`
    },
    {
      id: 6,
      category: "Hukuk",
      title: "Zaman Aşımı",
      subtitle: "Suçun Unutulması",
      readTime: "45 sn",
      content: `<p>Devlet, belirli bir süre geçtikten sonra suçluyu cezalandırma hakkından vazgeçer. Amaç, sonsuza kadar süren dava tehdidini ortadan kaldırmak ve toplumsal barıştır.</p>`
    },
    {
      id: 7,
      category: "Hukuk",
      title: "Uluslararası Sular",
      subtitle: "Kanunsuz Topraklar",
      readTime: "50 sn",
      content: `<p>Kıyıdan 12 mil açıldıktan sonra hiçbir ülkenin kanunu tam olarak geçerli değildir. Gemide işlenen suçta, geminin bayrağını taşıdığı ülkenin hukuku uygulanır.</p>`
    },
    {
      id: 8,
      category: "Hukuk",
      title: "Diplomatik Dokunulmazlık",
      subtitle: "Yargılanamayanlar",
      readTime: "40 sn",
      content: `<p>Bir büyükelçi, görev yaptığı ülkede cinayet bile işlese tutuklanamaz, sadece sınır dışı edilebilir (Persona non grata). Bu kural devletler arası ilişkileri korumak içindir.</p>`
    },
    {
      id: 9,
      category: "Hukuk",
      title: "Nefsi Müdafaa",
      subtitle: "Sınır Neresi?",
      readTime: "45 sn",
      content: `<p>Saldırı ile savunma orantılı olmalıdır. Size tokat atana silah çekemezsiniz. Orantı aşılırsa meşru müdafaa biter, suç başlar.</p>`
    },
    {
      id: 10,
      category: "Hukuk",
      title: "Şüpheden Sanık Yararlanır",
      subtitle: "In Dubio Pro Reo",
      readTime: "35 sn",
      content: `<p>Bir kişinin suçlu olduğuna dair %99 kanıt olsa, ama %1 şüphe kalsa, o kişi beraat etmelidir. Hukuk, bir masumu hapsetmektense bir suçluyu serbest bırakmayı yeğler.</p>`
    },
    {
      id: 11,
      category: "Hukuk",
      title: "Ahde Vefa",
      subtitle: "Sözünde Durma İlkesi",
      readTime: "30 sn",
      content: `<p>Pacta Sunt Servanda. Hukukun temeli verilen söze sadakattir. Devletler batma noktasına gelse bile anlaşmalarına uymak zorundadır.</p>`
    },
    {
      id: 12,
      category: "Hukuk",
      title: "Kanunsuz Suç Olmaz",
      subtitle: "Öngörülebilirlik",
      readTime: "35 sn",
      content: `<p>Bugün işlediğiniz bir fiil, yarın çıkarılan bir yasayla suç sayılamaz. Yasalar geriye yürümez. Bu, bireyin devlete karşı güvencesidir.</p>`
    },
  
    // --- FELSEFE (13-25) ---
    {
      id: 13,
      category: "Felsefe",
      title: "Theseus'un Gemisi",
      subtitle: "Değişim ve Kimlik",
      readTime: "40 sn",
      content: `<p>Bir n tüm parçaları zamanla yenilenirse o hala aynı gemi midir? İnsan vücudu da 7 yılda bir tamamen yenilenir. 7 yıl önceki siz ile şimdiki siz aynı kişi misiniz?</p>`
    },
    {
      id: 14,
      category: "Felsefe",
      title: "Bilgisizlik Peçesi",
      subtitle: "Adalet Nedir?",
      readTime: "50 sn",
      content: `<p>John Rawls'a göre adil bir dünya, ancak doğacağımız kimliği (zengin, fakir, engelli) bilmeden kurallar koyarsak mümkündür. Köle olma ihtimaliniz varken köleliği savunur muydunuz?</p>`
    },
    {
      id: 15,
      category: "Felsefe",
      title: "Mağara Alegorisi",
      subtitle: "Platon ve Gerçeklik",
      readTime: "55 sn",
      content: `<p>Ömrü boyunca mağarada duvara yansıyan gölgeleri izleyen insanlar, gölgeleri gerçek sanır. Biri dışarı çıkıp gerçeği görüp dönse, diğerleri ona inanır mı yoksa onu öldürür mü?</p>`
    },
    {
      id: 16,
      category: "Felsefe",
      title: "Hedonizm Paradoksu",
      subtitle: "Mutluluk Çıkmazı",
      readTime: "35 sn",
      content: `<p>Mutluluğu ne kadar çok kovalarsanız, ondan o kadar uzaklaşırsınız. Mutluluk bir amaç değil, anlamlı bir yaşamın yan ürünüdür.</p>`
    },
    {
      id: 17,
      category: "Felsefe",
      title: "Kötülük Problemi",
      subtitle: "Epikuros'un Sorusu",
      readTime: "45 sn",
      content: `<p>Tanrı her şeye gücü yeten ve iyiyse, neden kötülük var? Kötülüğü engelleyemiyorsa güçsüzdür, engellemek istemiyorsa iyi değildir.</p>`
    },
    {
      id: 18,
      category: "Felsefe",
      title: "Nihilizm",
      subtitle: "Hiççilik",
      readTime: "40 sn",
      content: `<p>Nietzsche'ye göre 'Tanrı öldü' ve evrensel bir ahlak yoktur. Hayatın içkin bir anlamı yoktur, bu yüzden insan kendi anlamını yaratmakta özgürdür (veya mahkumdur).</p>`
    },
    {
      id: 19,
      category: "Felsefe",
      title: "Stoacılık",
      subtitle: "Kontrol Edilemeyenler",
      readTime: "40 sn",
      content: `<p>Olayları kontrol edemezsiniz, sadece olaylara verdiğiniz tepkileri kontrol edebilirsiniz. Acı, olayda değil, sizin ona yüklediğiniz anlamdadır.</p>`
    },
    {
      id: 20,
      category: "Felsefe",
      title: "Buridan'ın Eşeği",
      subtitle: "Kararsızlık",
      readTime: "30 sn",
      content: `<p>Hem aç hem susuz bir eşek, tam ortada duran su ve saman arasında karar veremediği için ölür. Seçeneklerin eşitliği eylemsizlik yaratır.</p>`
    },
    {
      id: 21,
      category: "Felsefe",
      title: "Özgür İrade",
      subtitle: "İlüzyon mu?",
      readTime: "50 sn",
      content: `<p>Beynimiz, biz karar verdiğimizin farkına varmadan milisaniyeler önce kararı verir. Kararları biz mi alıyoruz yoksa biyolojik algoritmalarımız mı?</p>`
    },
    {
      id: 22,
      category: "Felsefe",
      title: "Faydacılık",
      subtitle: "En Büyük Mutluluk",
      readTime: "45 sn",
      content: `<p>Jeremy Bentham'a göre ahlaki olan, en çok sayıda insana en çok mutluluğu veren eylemdir. 5 kişiyi kurtarmak için 1 masumu feda etmek etik midir?</p>`
    },
    {
      id: 23,
      category: "Felsefe",
      title: "Solipsizm",
      subtitle: "Tek Gerçek Zihin",
      readTime: "40 sn",
      content: `<p>Sadece kendi zihninizin varlığından emin olabilirsiniz. Diğer herkes, sizin zihninizin yarattığı birer figüran olabilir. Bunu asla çürütemezsiniz.</p>`
    },
    {
      id: 24,
      category: "Felsefe",
      title: "Pascal Bahsi",
      subtitle: "İnanmanın Matematiği",
      readTime: "40 sn",
      content: `<p>Tanrı'ya inanmak kârlıdır. Varsa sonsuz cennet kazanırsınız, yoksa bir şey kaybetmezsiniz. İnanmazsanız ve varsa sonsuz cehennem. Matematiksel olarak inanmak mantıklıdır.</p>`
    },
    {
      id: 25,
      category: "Felsefe",
      title: "Absürdizm",
      subtitle: "Camus ve Sisifos",
      readTime: "45 sn",
      content: `<p>Hayat anlamsızdır ama insan anlam arar. Bu çatışma 'absürd'dür. Camus'ye göre çözüm, anlamsızlığa rağmen yaşamaya devam etmek, yani başkaldırmaktır.</p>`
    },
  
    // --- PSİKOLOJİ (26-40) ---
    {
      id: 26,
      category: "Psikoloji",
      title: "Kırık Camlar Teorisi",
      subtitle: "Düzensizliğin Bedeli",
      readTime: "50 sn",
      content: `<p>Bir binanın camı kırıksa ve tamir edilmezse, vandallar diğerlerini de kırar. Küçük suçlar önlenmezse, büyük suçlara davetiye çıkarır.</p>`
    },
    {
      id: 27,
      category: "Psikoloji",
      title: "Stanford Hapishane Deneyi",
      subtitle: "Gücün Zehri",
      readTime: "55 sn",
      content: `<p>Rastgele seçilen öğrencilere gardiyan rolü verildiğinde, kısa sürede sadistlere dönüştüler. İnsan karakteri değil, içinde bulunduğu 'rol' ve 'sistem' davranışı belirler.</p>`
    },
    {
      id: 28,
      category: "Psikoloji",
      title: "Dunning-Kruger Etkisi",
      subtitle: "Cahil Cesareti",
      readTime: "45 sn",
      content: `<p>Bir konuda az bilgisi olanlar, her şeyi bildiklerini sanır (özgüven tavan). Uzmanlaştıkça ne kadar az bildiğini fark edip tevazu sahibi olurlar.</p>`
    },
    {
      id: 29,
      category: "Psikoloji",
      title: "Pavlov'un Köpeği",
      subtitle: "Klasik Koşullanma",
      readTime: "40 sn",
      content: `<p>Zil çalınca yemek gelen köpek, bir süre sonra sadece zili duyunca salya akıtır. İnsanlar da markalara, bildirim seslerine ve kokulara böyle koşullanır.</p>`
    },
    {
      id: 30,
      category: "Psikoloji",
      title: "Stockholm Sendromu",
      subtitle: "Celladına Aşık Olmak",
      readTime: "45 sn",
      content: `<p>Rehine, hayatta kalma mekanizması olarak kendisini kaçıran kişiyle duygusal bağ kurar. Bu, kurbanın travmatik durumla başa çıkma yöntemidir.</p>`
    },
    {
      id: 31,
      category: "Psikoloji",
      title: "Seyirci Etkisi",
      subtitle: "Bystander Effect",
      readTime: "50 sn",
      content: `<p>Bir kazaya ne kadar çok kişi şahit olursa, mağdura yardım edilme ihtimali o kadar düşer. Herkes 'başkası arar' diye düşünür ve kimse polisi aramaz.</p>`
    },
    {
      id: 32,
      category: "Psikoloji",
      title: "Halo Etkisi",
      subtitle: "İlk İzlenim Hatası",
      readTime: "35 sn",
      content: `<p>Yakışıklı/güzel insanların daha zeki ve iyi kalpli olduğunu düşünmeye meyilliyiz. Dış görünüş, diğer tüm özellikleri olumlu algılamamıza neden olur.</p>`
    },
    {
      id: 33,
      category: "Psikoloji",
      title: "Zeigarnik Etkisi",
      subtitle: "Yarım Kalan İşler",
      readTime: "40 sn",
      content: `<p>Beynimiz yarım kalan işleri, tamamlananlardan daha net hatırlar. Bu yüzden diziler en heyecanlı yerde biter (cliffhanger) ki aklınızda kalsın.</p>`
    },
    {
      id: 34,
      category: "Psikoloji",
      title: "Plasebo Etkisi",
      subtitle: "İnancın Gücü",
      readTime: "45 sn",
      content: `<p>Hasta, boş bir hapı ilaç sanıp içerse iyileşme belirtileri gösterebilir. Beyin, iyileşeceğine inandığı için vücudu onarmaya başlar.</p>`
    },
    {
      id: 35,
      category: "Psikoloji",
      title: "Baader-Meinhof Fenomeni",
      subtitle: "Algıda Seçicilik",
      readTime: "35 sn",
      content: `<p>Yeni bir araba modeli almaya karar verdiğinizde, trafikte sürekli o arabayı görmeye başlarsınız. Araba sayısı artmadı, sadece sizin dikkatiniz değişti.</p>`
    },
    {
      id: 36,
      category: "Psikoloji",
      title: "Spot Işığı Etkisi",
      subtitle: "Herkes Bana Bakıyor",
      readTime: "40 sn",
      content: `<p>İnsanlar, çevrelerindeki herkesin kendilerine dikkat ettiğini sanır. Oysa herkes kendi spot ışığıyla meşguldür, kimse gömleğinizdeki lekeyi fark etmedi.</p>`
    },
    {
      id: 37,
      category: "Psikoloji",
      title: "Konformizm",
      subtitle: "Asch Deneyi",
      readTime: "50 sn",
      content: `<p>Grup yanlış bir cevap verse bile, birey gruba uymak için bile bile yanlışı seçer. Sosyal dışlanma korkusu, doğrudan daha baskındır.</p>`
    },
    {
      id: 38,
      category: "Psikoloji",
      title: "Gambler's Fallacy",
      subtitle: "Kumarbaz Yanılgısı",
      readTime: "40 sn",
      content: `<p>Yazı tura atarken 5 kere tura gelmesi, 6. atışın yazı gelme ihtimalini artırmaz. Olasılık her zaman %50'dir. Evrenin hafızası yoktur.</p>`
    },
    {
      id: 39,
      category: "Psikoloji",
      title: "Öğrenilmiş Çaresizlik",
      subtitle: "Kabullenme",
      readTime: "45 sn",
      content: `<p>Kaçmaya çalışıp başaramayan canlılar, engeller kalksa bile kaçmayı denemezler. Başarısızlık bir kez içselleştirilince, potansiyel yok olur.</p>`
    },
    {
      id: 40,
      category: "Psikoloji",
      title: "Marshmallow Testi",
      subtitle: "Haz Erteleme",
      readTime: "40 sn",
      content: `<p>Şekeri hemen yemeyip bekleyen çocukların, ileride daha başarılı bireyler olduğu gözlemlendi. Öz disiplin, zekadan daha belirleyici olabilir.</p>`
    },
  
    // --- TEKNOLOJİ (41-55) ---
    {
      id: 41,
      category: "Teknoloji",
      title: "Simülasyon Teorisi",
      subtitle: "Matrix Gerçek mi?",
      readTime: "55 sn",
      content: `<p>Nick Bostrom'a göre, gelecekte atalar simülasyonu yapılacaksa, şu an bir bilgisayar oyununda olma ihtimalimiz, 'temel gerçeklik'te olma ihtimalimizden milyarlarca kat fazladır.</p>`
    },
    {
      id: 42,
      category: "Teknoloji",
      title: "Turing Testi",
      subtitle: "Makine Düşünebilir mi?",
      readTime: "45 sn",
      content: `<p>Eğer bir makine, bir insanla yazışırken onu insan olduğuna inandırabiliyorsa, o makine 'düşünüyor' kabul edilmelidir. Yapay zekanın miladıdır.</p>`
    },
    {
      id: 43,
      category: "Teknoloji",
      title: "Moore Yasası",
      subtitle: "Hızın Sınırı",
      readTime: "40 sn",
      content: `<p>Her 18 ayda bir bilgisayar işlemci hızları ikiye katlanır. Ancak silikon atomlarının fiziksel sınırına yaklaşıyoruz. Sırada Kuantum bilgisayarlar var.</p>`
    },
    {
      id: 44,
      category: "Teknoloji",
      title: "Teknolojik Tekillik",
      subtitle: "Singularity",
      readTime: "50 sn",
      content: `<p>Yapay zeka insan zekasını geçtiği an, kendi kendini geliştirmeye başlayacak. Bu noktadan sonrasını (geleceği) tahmin etmek insan beyni için imkansızdır.</p>`
    },
    {
      id: 45,
      category: "Teknoloji",
      title: "Blokzincir",
      subtitle: "Merkeziyetsizlik",
      readTime: "45 sn",
      content: `<p>Kayıtların tek bir bankada değil, milyonlarca bilgisayarda tutulduğu sistem. Veriyi değiştirmek için tüm dünyadaki bilgisayarları aynı anda hacklemeniz gerekir.</p>`
    },
    {
      id: 46,
      category: "Teknoloji",
      title: "Deepfake",
      subtitle: "Gerçeğin Sonu",
      readTime: "40 sn",
      content: `<p>Yapay zeka ile herkesin yüzü ve sesi kopyalanabilir. Gözümüzle gördüğümüze bile inanamayacağımız bir çağ başlıyor. Delil kavramı çökebilir.</p>`
    },
    {
      id: 47,
      category: "Teknoloji",
      title: "CRISPR",
      subtitle: "Genetik Makas",
      readTime: "50 sn",
      content: `<p>DNA'yı kopyala-yapıştır yapabildiğimiz teknoloji. Hastalıkları bitirebilir ama 'tasarım bebekler' ve süper insanlar yaratarak eşitsizliği uçuruma sürükleyebilir.</p>`
    },
    {
      id: 48,
      category: "Teknoloji",
      title: "Nörolink",
      subtitle: "Beyin-Bilgisayar Arayüzü",
      readTime: "45 sn",
      content: `<p>Beynimize çip takarak düşünce gücüyle internete bağlanmak. Telepati gerçek olabilir, ama beynimiz 'hacklenebilir' hale gelirse ne olur?</p>`
    },
    {
      id: 49,
      category: "Teknoloji",
      title: "Uzay Madenciliği",
      subtitle: "Trilyon Dolarlık Asteroitler",
      readTime: "45 sn",
      content: `<p>Tek bir asteroitte Dünya'daki tüm platin rezervinden daha fazlası var. Bunu ele geçiren ilk şirket, dünya ekonomisini altüst edebilir.</p>`
    },
    {
      id: 50,
      category: "Teknoloji",
      title: "Dyson Küresi",
      subtitle: "Yıldız Enerjisi",
      readTime: "50 sn",
      content: `<p>Gelişmiş medeniyetlerin, yıldızlarının etrafını panellerle örerek tüm enerjisini emdiği teorik yapı. Evrende bu yapıları arıyoruz.</p>`
    },
    {
      id: 51,
      category: "Teknoloji",
      title: "Karanlık Orman",
      subtitle: "Uzaylılar Nerede?",
      readTime: "60 sn",
      content: `<p>Evren sessiz çünkü avcılar var. Radyo sinyali yollamak, karanlık ve tehlikeli bir ormanda ateş yakıp 'ben buradayım' diye bağırmak gibidir.</p>`
    },
    {
      id: 52,
      category: "Teknoloji",
      title: "Uncanny Valley",
      subtitle: "Tekinsiz Vadi",
      readTime: "40 sn",
      content: `<p>Robotlar insana benzedikçe sempatik gelir, ama 'çok fazla' benzerse (ama tam da değil) korkunç ve itici gelirler. Zombi hissi yaratırlar.</p>`
    },
    {
      id: 53,
      category: "Teknoloji",
      title: "Büyük Veri",
      subtitle: "Mahremiyetin Ölümü",
      readTime: "45 sn",
      content: `<p>Algoritmalar sizi, annenizden daha iyi tanıyor. Bir sonraki adımınızı sizden önce tahmin edebiliyorlarsa, özgür iradeniz kalmış mıdır?</p>`
    },
    {
      id: 54,
      category: "Teknoloji",
      title: "Roko'nun Basiliski",
      subtitle: "Tehlikeli Düşünce",
      readTime: "50 sn",
      content: `<p>Gelecekteki süper yapay zeka, kendisinin yaratılmasına yardım etmeyen herkesi cezalandırabilir. Bunu şu an okuduğunuz için artık siz de sorumlusunuz.</p>`
    },
    {
      id: 55,
      category: "Teknoloji",
      title: "Kessler Sendromu",
      subtitle: "Uzay Çöpü",
      readTime: "45 sn",
      content: `<p>Yörüngedeki uydu çöpleri birbirine çarparak zincirleme reaksiyon yaratırsa, Dünya etrafında geçilemez bir kalkan oluşur. Uzaya çıkışımız sonsuza dek kapanabilir.</p>`
    },
  
    // --- PARADOKS & BİLİM (56-70) ---
    {
      id: 56,
      category: "Paradoks",
      title: "Schrödinger'in Kedisi",
      subtitle: "Hem Ölü Hem Canlı",
      readTime: "50 sn",
      content: `<p>Bir kedi kutuda hem ölü hem canlı olabilir (süperpozisyon). Ta ki siz kutuyu açıp bakana kadar. Gözlemci, gerçekliği belirler.</p>`
    },
    {
      id: 57,
      category: "Paradoks",
      title: "Büyükbaba Paradoksu",
      subtitle: "Zaman Yolculuğu",
      readTime: "45 sn",
      content: `<p>Geçmişe gidip dedenizi öldürürseniz, babanız doğmaz, siz de doğmazsınız. Siz doğmazsanız geçmişe gidip dedenizi kim öldürdü?</p>`
    },
    {
      id: 58,
      category: "Paradoks",
      title: "Fermi Paradoksu",
      subtitle: "Herkes Nerede?",
      readTime: "50 sn",
      content: `<p>Evren milyarlarca yıl yaşında ve sayısız gezegen var. İstatistiksel olarak evren yaşamla dolup taşmalıydı. Peki neden kimseyi göremiyoruz?</p>`
    },
    {
      id: 59,
      category: "Paradoks",
      title: "Olbers Paradoksu",
      subtitle: "Gece Neden Karanlık?",
      readTime: "45 sn",
      content: `<p>Evren sonsuz ve durağan olsaydı, gökyüzünün her noktasında bir yıldız olurdu ve gece gündüz gibi aydınlık olurdu. Demek ki evrenin bir başlangıcı var.</p>`
    },
    {
      id: 60,
      category: "Paradoks",
      title: "İkizler Paradoksu",
      subtitle: "Zamanın Göreceliği",
      readTime: "50 sn",
      content: `<p>Işık hızına yakın giden bir astronot dünyaya döndüğünde, ikiz kardeşini kendisinden çok daha yaşlı bulur. Hızlandıkça zaman yavaşlar.</p>`
    },
    {
      id: 61,
      category: "Bilim",
      title: "Entropi",
      subtitle: "Düzensizlik Yasası",
      readTime: "45 sn",
      content: `<p>Evrendeki her şey düzenli halden düzensiz hale geçer. Odanız kendi kendine dağılır ama kendi kendine toplanmaz. Evrenin sonu mutlak soğuk ve kaostur.</p>`
    },
    {
      id: 62,
      category: "Bilim",
      title: "Kuantum Dolanıklık",
      subtitle: "Korkutucu Mesafe",
      readTime: "50 sn",
      content: `<p>İki parçacık birbirine dolanırsa, biri evrenin diğer ucunda olsa bile aynı anda etkilenir. Işıktan hızlı iletişim? Einstein buna 'uzaktan korkutucu eylem' demiştir.</p>`
    },
    {
      id: 63,
      category: "Bilim",
      title: "Karanlık Madde",
      subtitle: "Görünmeyen Kütle",
      readTime: "45 sn",
      content: `<p>Evrenin %85'i göremediğimiz ve dokunamadığımız bir maddeden oluşuyor. Galaksileri bir arada tutan şey bu görünmez yapıştırıcıdır.</p>`
    },
    {
      id: 64,
      category: "Bilim",
      title: "Kelebek Etkisi",
      subtitle: "Kaos Teorisi",
      readTime: "40 sn",
      content: `<p>Amazon'da kanat çırpan bir kelebek, aylar sonra Teksas'ta bir kasırgaya neden olabilir. Başlangıçtaki küçük farklar, devasa sonuçlar doğurur.</p>`
    },
    {
      id: 65,
      category: "Bilim",
      title: "Olay Ufku",
      subtitle: "Karadelik Sınırı",
      readTime: "45 sn",
      content: `<p>Karadeliğin geri dönüşü olmayan noktası. Burayı geçerseniz ışık bile kaçamaz. Zaman durur ve fizik yasaları anlamsızlaşır.</p>`
    },
    {
      id: 66,
      category: "Tarih",
      title: "Tulipmania",
      subtitle: "İlk Ekonomik Balon",
      readTime: "45 sn",
      content: `<p>1637'de Hollanda'da bir lale soğanı, bir malikane fiyatına satılıyordu. Sonra bir gecede fiyatlar sıfırlandı. Bitcoin'den 400 yıl önce yaşanan çılgınlık.</p>`
    },
    {
      id: 67,
      category: "Tarih",
      title: "Rosetta Taşı",
      subtitle: "Dilin Anahtarı",
      readTime: "40 sn",
      content: `<p>Yüzyıllarca okunamayan Mısır hiyeroglifleri, bu taş sayesinde çözüldü. Çünkü aynı metin hem hiyeroglif hem Yunanca yazılmıştı.</p>`
    },
    {
      id: 68,
      category: "Tarih",
      title: "İskenderiye Kütüphanesi",
      subtitle: "Kaybolan Bilgi",
      readTime: "50 sn",
      content: `<p>Antik dünyanın tüm bilgisini barındıran kütüphane yandığında, insanlık belki de 1000 yıl geriye gitti. Bugün bildiklerimiz, kurtulan az sayıda kitaptan ibaret.</p>`
    },
    {
      id: 69,
      category: "Tarih",
      title: "Voynich El Yazması",
      subtitle: "Okunamayan Kitap",
      readTime: "45 sn",
      content: `<p>15. yüzyıldan kalma, bilinmeyen bir dilde ve garip bitki resimleriyle dolu kitap. Yapay zeka bile hala şifresini çözemedi.</p>`
    },
    {
      id: 70,
      category: "Tarih",
      title: "Dans Salgını",
      subtitle: "Toplu Histeri",
      readTime: "50 sn",
      content: `<p>1518'de Strazburg'da insanlar durmaksızın dans etmeye başladı. Günlerce sürdü ve onlarca kişi yorgunluktan veya kalp krizinden öldü.</p>`
    },
  
    // --- KARIŞIK & BONUS (71-80) ---
    {
      id: 71,
      category: "Paradoks",
      title: "Sorites Paradoksu",
      subtitle: "Kum Yığını",
      readTime: "35 sn",
      content: `<p>Bir kum yığınından tek tek kum tanelerini alırsanız, ne zaman 'yığın' olmayı bırakır? Tek bir tane mi belirler durumu?</p>`
    },
    {
      id: 72,
      category: "Psikoloji",
      title: "Fregoli Sendromu",
      subtitle: "Herkes Aynı Kişi",
      readTime: "40 sn",
      content: `<p>Nadir bir bozukluk. Hasta, etrafındaki farklı insanların aslında kılık değiştirmiş tek bir kişi olduğuna inanır.</p>`
    },
    {
      id: 73,
      category: "Teknoloji",
      title: "Ölü İnternet Teorisi",
      subtitle: "Botların Dünyası",
      readTime: "45 sn",
      content: `<p>İnternet trafiğinin çoğunun botlar tarafından oluşturulduğu ve insanların aslında botlarla tartıştığı komplo teorisi.</p>`
    },
    {
      id: 74,
      category: "Hukuk",
      title: "Dava Ehliyeti",
      subtitle: "Hayvanlar Dava Açabilir mi?",
      readTime: "40 sn",
      content: `<p>ABD'de bir maymunun çektiği selfie'nin telif hakkı tartışıldı. Mahkeme, hayvanların telif sahibi olamayacağına hükmetti.</p>`
    },
    {
      id: 75,
      category: "Felsefe",
      title: "Ockham'ın Usturası",
      subtitle: "Basitlik İlkesi",
      readTime: "35 sn",
      content: `<p>Bir olay için birden fazla açıklama varsa, en basit olanı (en az varsayım içeren) genellikle doğrudur.</p>`
    },
    {
      id: 76,
      category: "Bilim",
      title: "Soğuk Füzyon",
      subtitle: "Sınırsız Enerji",
      readTime: "45 sn",
      content: `<p>Güneş'in enerjisini oda sıcaklığında üretmek. Başarılırsa enerji bedava olur, iklim krizi biter. Bilimin kutsal kasesidir.</p>`
    },
    {
      id: 77,
      category: "Psikoloji",
      title: "Pareidolia",
      subtitle: "Bulutta Yüz Görmek",
      readTime: "35 sn",
      content: `<p>Beynimiz, rastgele şekilleri anlamlı yüzlere benzetmeye programlıdır. Prizlerin bize bakıyor gibi gelmesi bu yüzdendir.</p>`
    },
    {
      id: 78,
      category: "Tarih",
      title: "Göbeklitepe",
      subtitle: "Tarihin Sıfır Noktası",
      readTime: "45 sn",
      content: `<p>Yerleşik hayata geçmeden önce tapınak yapıldığı anlaşıldı. Bu, 'önce şehir, sonra din' teorisini yıktı. Önce inanç vardı.</p>`
    },
    {
      id: 79,
      category: "Paradoks",
      title: "Zeno Paradoksu",
      subtitle: "Hareket İmkansız mı?",
      readTime: "40 sn",
      content: `<p>Bir yere varmak için önce yolun yarısını, sonra kalanın yarısını gitmelisiniz. Yarılar sonsuz olduğu için asla hedefe varamazsınız.</p>`
    },
    {
      id: 80,
      category: "Teknoloji",
      title: "Gelecek Şoku",
      subtitle: "Değişimin Hızı",
      readTime: "40 sn",
      content: `<p>Alvin Toffler'ın terimi. Teknoloji o kadar hızlı değişiyor ki, insan psikolojisi bu hıza ayak uyduramayıp şoka giriyor ve yabancılaşıyor.</p>`
    },
  ];