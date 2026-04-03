
// ═══════════════════════════════════════
// SOUND SYSTEM
// ═══════════════════════════════════════
let soundEnabled = true;
let AudioCtx = null;

function getAudioCtx() {
  if (!AudioCtx) AudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return AudioCtx;
}

function playSound(type) {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') ctx.resume();
    
    if (type === 'inc') {
      // Son discret: petit "tick" doux
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === 'shiny') {
      // Son shiny: accord ascendant brillant
      [523, 659, 784, 1047].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
        gain.gain.setValueAtTime(0.0, ctx.currentTime + i * 0.08);
        gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + i * 0.08 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.3);
        osc.start(ctx.currentTime + i * 0.08);
        osc.stop(ctx.currentTime + i * 0.08 + 0.35);
      });
    } else if (type === 'pause') {
      // Son pause: ton grave court
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    }
  } catch(e) {}
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  try { localStorage.setItem('sound_enabled', soundEnabled); } catch(e) {}
  const btn = document.getElementById('sound-btn');
  if (btn) btn.textContent = soundEnabled ? '🔔' : '🔕';
  toast(soundEnabled ? '🔔 Son activé' : '🔕 Son désactivé');
}

// ═══════════════════════════════════════
// OBS HOTKEY ENDPOINT
// Appelle /hotkey.html?action=inc1 depuis OBS Script
// OU utilise les raccourcis navigateur (focus requis)
// ═══════════════════════════════════════
// Check URL params for hotkey actions (pour appels OBS)
(function checkHotkeyParam() {
  const params = new URLSearchParams(location.search);
  const action = params.get('action');
  if (!action) return;
  // Nettoie l'URL sans recharger
  history.replaceState({}, '', location.pathname);
  // Execute action après boot
  setTimeout(() => {
    if (action === 'inc1') inc(1);
    else if (action === 'inc3') inc(3);
    else if (action === 'inc5') inc(5);
    else if (action === 'inc10') inc(10);
    else if (action === 'pause') togglePause();
    else if (action === 'shiny') { if(confirm('Confirmer shiny trouvé ?')) foundShiny(); }
  }, 1500);
})();

// ═══════════════════════════════════════
// PokeMMO Shiny Tracker — app.js
// Backend: Supabase
// ═══════════════════════════════════════

let SB_URL = '', SB_KEY = '';
let SAVE_TIMER = null;
let POLL_TIMER = null;
let lastSavedTs = 0;

// ── POKEMON DATABASE (Gen 1-5) ───────────────────────
const PKM = [[1,'Bulbizarre','bulbasaur'],[2,'Herbizarre','ivysaur'],[3,'Florizarre','venusaur'],[4,'Salamèche','charmander'],[5,'Reptincel','charmeleon'],[6,'Dracaufeu','charizard'],[7,'Carapuce','squirtle'],[8,'Carabaffe','wartortle'],[9,'Tortank','blastoise'],[10,'Chenipan','caterpie'],[11,'Chrysacier','metapod'],[12,'Papilusion','butterfree'],[13,'Aspicot','weedle'],[14,'Coconfort','kakuna'],[15,'Dardargnan','beedrill'],[16,'Roucool','pidgey'],[17,'Roucoups','pidgeotto'],[18,'Roucarnage','pidgeot'],[19,'Rattata','rattata'],[20,'Rattatac','raticate'],[21,'Piafabec','spearow'],[22,'Rapasdepic','fearow'],[23,'Abo','ekans'],[24,'Arbok','arbok'],[25,'Pikachu','pikachu'],[26,'Raichu','raichu'],[27,'Sabelette','sandshrew'],[28,'Sablaireau','sandslash'],[29,'Nidoran♀','nidoran-f'],[30,'Nidorina','nidorina'],[31,'Nidoqueen','nidoqueen'],[32,'Nidoran♂','nidoran-m'],[33,'Nidorino','nidorino'],[34,'Nidoking','nidoking'],[35,'Mélofée','clefairy'],[36,'Mélodelfe','clefable'],[37,'Goupix','vulpix'],[38,'Feunard','ninetales'],[39,'Rondoudou','jigglypuff'],[40,'Grodoudou','wigglytuff'],[41,'Nosferapti','zubat'],[42,'Nosferalto','golbat'],[43,'Mystherbe','oddish'],[44,'Ortide','gloom'],[45,'Rafflesia','vileplume'],[46,'Paras','paras'],[47,'Parasect','parasect'],[48,'Mysdibule','venonat'],[49,'Aéromite','venomoth'],[50,'Taupiqueur','diglett'],[51,'Triopikeur','dugtrio'],[52,'Miaouss','meowth'],[53,'Persian','persian'],[54,'Psykokwak','psyduck'],[55,'Akwakwak','golduck'],[56,'Férosinge','mankey'],[57,'Colossinge','primeape'],[58,'Caninos','growlithe'],[59,'Arcanin','arcanine'],[60,'Ptitard','poliwag'],[61,'Têtarte','poliwhirl'],[62,'Tartard','poliwrath'],[63,'Abra','abra'],[64,'Kadabra','kadabra'],[65,'Alakazam','alakazam'],[66,'Machoc','machop'],[67,'Machopeur','machoke'],[68,'Mackogneur','machamp'],[69,'Chétiflor','bellsprout'],[70,'Boustiflor','weepinbell'],[71,'Empiflor','victreebel'],[72,'Tentacool','tentacool'],[73,'Tentacruel','tentacruel'],[74,'Racaillou','geodude'],[75,'Gravalanch','graveler'],[76,'Grolem','golem'],[77,'Ponyta','ponyta'],[78,'Galopa','rapidash'],[79,'Ramoloss','slowpoke'],[80,'Flagadoss','slowbro'],[81,'Magnéti','magnemite'],[82,'Magneton','magneton'],[83,'Canarticho','farfetchd'],[84,'Doduo','doduo'],[85,'Dodrio','dodrio'],[86,'Otaria','seel'],[87,'Lamantine','dewgong'],[88,'Tadmorv','grimer'],[89,'Grotadmorv','muk'],[90,'Kokiyas','shellder'],[91,'Crustabri','cloyster'],[92,'Fantominus','gastly'],[93,'Spectrum','haunter'],[94,'Ectoplasma','gengar'],[95,'Onix','onix'],[96,'Soporifik','drowzee'],[97,'Hypnomade','hypno'],[98,'Krabby','krabby'],[99,'Krabboss','kingler'],[100,'Voltorbe','voltorb'],[101,'Électrode','electrode'],[102,'Noeunoeuf','exeggcute'],[103,'Noadkoko','exeggutor'],[104,'Osselait','cubone'],[105,'Ossatueur','marowak'],[106,'Kicklee','hitmonlee'],[107,'Tygnon','hitmonchan'],[108,'Excelangue','lickitung'],[109,'Smogo','koffing'],[110,'Smogogo','weezing'],[111,'Rhinocorne','rhyhorn'],[112,'Rhinoféros','rhydon'],[113,'Leveinard','chansey'],[114,'Saquedeneu','tangela'],[115,'Kangaskhan','kangaskhan'],[116,'Hypotrempe','horsea'],[117,'Hypocéan','seadra'],[118,'Poissirène','goldeen'],[119,'Poissoroy','seaking'],[120,'Étofraisel','staryu'],[121,'Staross','starmie'],[122,'M. Mime','mr-mime'],[123,'Insécateur','scyther'],[124,'Lippoutou','jynx'],[125,'Élektek','electabuzz'],[126,'Magmar','magmar'],[127,'Scarabrute','pinsir'],[128,'Tauros','tauros'],[129,'Magicarpe','magikarp'],[130,'Léviator','gyarados'],[131,'Lokhlass','lapras'],[132,'Métamorph','ditto'],[133,'Évoli','eevee'],[134,'Aquali','vaporeon'],[135,'Voltali','jolteon'],[136,'Pyroli','flareon'],[137,'Porygon','porygon'],[138,'Amonita','omanyte'],[139,'Amonistar','omastar'],[140,'Kabuto','kabuto'],[141,'Kabutops','kabutops'],[142,'Ptéra','aerodactyl'],[143,'Ronflex','snorlax'],[144,'Artikodin','articuno'],[145,'Électhor','zapdos'],[146,'Sulfura','moltres'],[147,'Minidraco','dratini'],[148,'Draco','dragonair'],[149,'Dracolosse','dragonite'],[150,'Mewtwo','mewtwo'],[151,'Mew','mew'],[152,'Germignon','chikorita'],[153,'Macronium','bayleef'],[154,'Méganium','meganium'],[155,'Héricendre','cyndaquil'],[156,'Feurisson','quilava'],[157,'Typhlosion','typhlosion'],[158,'Kaiminus','totodile'],[159,'Crocrodil','croconaw'],[160,'Aligatueur','feraligatr'],[161,'Fouinette','sentret'],[162,'Fouinar','furret'],[163,'Hoothoot','hoothoot'],[164,'Noarfang','noctowl'],[165,'Coxy','ledyba'],[166,'Coxyclaque','ledian'],[167,'Faaramanta','spinarak'],[168,'Migalos','ariados'],[169,'Nostenfer','crobat'],[170,'Chinchou','chinchou'],[171,'Lanturn','lanturn'],[172,'Pichu','pichu'],[173,'Mélo','cleffa'],[174,'Toudoudou','igglybuff'],[175,'Togepi','togepi'],[176,'Togetic','togetic'],[177,'Natu','natu'],[178,'Xatu','xatu'],[179,'Wattouat','mareep'],[180,'Lainergie','flaaffy'],[181,'Pharamp','ampharos'],[182,'Joliflor','bellossom'],[183,'Marill','marill'],[184,'Azumarill','azumarill'],[185,'Boskara','sudowoodo'],[186,'Tarpaud','politoed'],[187,'Hoube','hoppip'],[188,'Floravol','skiploom'],[189,'Cotovol','jumpluff'],[190,'Chipokomon','aipom'],[191,'Tournegrin','sunkern'],[192,'Héliflor','sunflora'],[193,'Yanma','yanma'],[194,'Axoloto','wooper'],[195,'Maraiste','quagsire'],[196,'Mentali','espeon'],[197,'Noctali','umbreon'],[198,'Corboss','murkrow'],[199,'Roigada','slowking'],[200,'Feuforêve','misdreavus'],[201,'Zarbi','unown'],[202,'Goinfrock','wobbuffet'],[203,'Pokémanul','girafarig'],[204,'Pomdepik','pineco'],[205,'Foretress','forretress'],[206,'Dunspara','dunsparce'],[207,'Cizayox','gligar'],[208,'Steelix','steelix'],[209,'Snubbull','snubbull'],[210,'Granbull','granbull'],[211,'Qwilfish','qwilfish'],[212,'Cizayox','scizor'],[213,'Cheniselle','shuckle'],[214,'Scarhino','heracross'],[215,'Farfuret','sneasel'],[216,'Teddiursa','teddiursa'],[217,'Ursaring','ursaring'],[218,'Limagma','slugma'],[219,'Magcargo','magcargo'],[220,'Marcacrin','swinub'],[221,'Piloswine','piloswine'],[222,'Corayon','corsola'],[223,'Rémoraid','remoraid'],[224,'Octillery','octillery'],[225,'Cadoizo','delibird'],[226,'Démanta','mantine'],[227,'Airmure','skarmory'],[228,'Malosse','houndour'],[229,'Démolosse','houndoom'],[230,'Hyporoi','kingdra'],[231,'Phanpy','phanpy'],[232,'Donphan','donphan'],[233,'Porygon2','porygon2'],[234,'Cerfrousse','stantler'],[235,'Queulorior','smeargle'],[236,'Tyrogue','tyrogue'],[237,'Kapoera','hitmontop'],[238,'Smoochum','smoochum'],[239,'Élekid','elekid'],[240,'Magby','magby'],[241,'Écrémeuh','miltank'],[242,'Leuphorie','blissey'],[243,'Raikou','raikou'],[244,'Entei','entei'],[245,'Suicune','suicune'],[246,'Larvitar','larvitar'],[247,'Pupitard','pupitar'],[248,'Tyranocif','tyranitar'],[249,'Lugia','lugia'],[250,'Ho-Oh','ho-oh'],[251,'Celebi','celebi'],[252,'Arcko','treecko'],[253,'Massko','grovyle'],[254,'Jungko','sceptile'],[255,'Poussifeu','torchic'],[256,'Galifeu','combusken'],[257,'Braségali','blaziken'],[258,'Gobou','mudkip'],[259,'Flobio','marshtomp'],[260,'Laggron','swampert'],[261,'Medhyena','poochyena'],[262,'Grahyena','mightyena'],[263,'Zigzaton','zigzagoon'],[264,'Linéon','linoone'],[265,'Chenipotte','wurmple'],[266,'Blindalys','silcoon'],[267,'Charmillon','beautifly'],[268,'Couverdure','cascoon'],[269,'Parafilou','dustox'],[270,'Nénupiot','lotad'],[271,'Lombre','lombre'],[272,'Ludicolo','ludicolo'],[273,'Grainipse','seedot'],[274,'Tengalice','nuzleaf'],[275,'Tengalice','shiftry'],[276,'Nirondelle','taillow'],[277,'Tétarte','swellow'],[278,'Goélise','wingull'],[279,'Lakmécygne','pelipper'],[280,'Tarsal','ralts'],[281,'Kirlia','kirlia'],[282,'Gardevoir','gardevoir'],[283,'Arakdo','surskit'],[284,'Arakdo','masquerain'],[285,'Balignon','shroomish'],[286,'Chapignon','breloom'],[287,'Parecool','slakoth'],[288,'Vigoroth','vigoroth'],[289,'Monaflèmit','slaking'],[290,'Ningale','nincada'],[291,'Ninjask','ninjask'],[292,'Munja','shedinja'],[293,'Chuchmur','whismur'],[294,'Ramboum','loudred'],[295,'Exploud','exploud'],[296,'Makuhita','makuhita'],[297,'Hariyama','hariyama'],[298,'Azurill','azurill'],[299,'Mélokrik','nosepass'],[300,'Skitty','skitty'],[301,'Delcatty','delcatty'],[302,'Mysdibule','sableye'],[303,'Crockentêt','mawile'],[304,'Aron','aron'],[305,'Lairon','lairon'],[306,'Aggron','aggron'],[307,'Meditikka','meditite'],[308,'Médicham','medicham'],[309,'Dynavolt','electrike'],[310,'Magnéton','manectric'],[311,'Posipi','plusle'],[312,'Négatif','minun'],[313,'Lumivole','volbeat'],[314,'Lumivole','illumise'],[315,'Rosélia','roselia'],[316,'Gloupti','gulpin'],[317,'Avaltout','swalot'],[318,'Carvanha','carvanha'],[319,'Sharpedo','sharpedo'],[320,'Wailmer','wailmer'],[321,'Wailord','wailord'],[322,'Chamallot','numel'],[323,'Camérupt','camerupt'],[324,'Chartor','torkoal'],[325,'Spoink','spoink'],[326,'Groret','grumpig'],[327,'Spinda','spinda'],[328,'Trapinch','trapinch'],[329,'Vibraninf','vibrava'],[330,'Libégon','flygon'],[331,'Cacnea','cacnea'],[332,'Cacturne','cacturne'],[333,'Tylton','swablu'],[334,'Altaria','altaria'],[335,'Zangoose','zangoose'],[336,'Séviper','seviper'],[337,'Cosmovum','lunatone'],[338,'Solochi','solrock'],[339,'Barbicha','barboach'],[340,'Barbicha','whiscash'],[341,'Écrapince','corphish'],[342,'Écrapince','crawdaunt'],[343,'Baltoy','baltoy'],[344,'Kaorine','claydol'],[345,'Lilia','lileep'],[346,'Cradopaud','cradily'],[347,'Anorith','anorith'],[348,'Armaldo','armaldo'],[349,'Bavard','feebas'],[350,'Milobellus','milotic'],[351,'Morpheo','castform'],[352,'Kecleon','kecleon'],[353,'Polichombr','shuppet'],[354,'Branette','banette'],[355,'Osselait','duskull'],[356,'Osseor','dusclops'],[357,'Tropius','tropius'],[358,'Draby','chimecho'],[359,'Absol','absol'],[360,'Bébéoeuf','wynaut'],[361,'Snorunt','snorunt'],[362,'Blizzaroi','glalie'],[363,'Spheal','spheal'],[364,'Barloche','sealeo'],[365,'Barloche','walrein'],[366,'Coquiperl','clamperl'],[367,'Huntail','huntail'],[368,'Gorebyss','gorebyss'],[369,'Relicanth','relicanth'],[370,'Lovdisc','luvdisc'],[371,'Draby','bagon'],[372,'Draby','shelgon'],[373,'Draby','salamence'],[374,'Terhal','beldum'],[375,'Métang','metang'],[376,'Métalosse','metagross'],[377,'Regirock','regirock'],[378,'Regice','regice'],[379,'Registeel','registeel'],[380,'Latias','latias'],[381,'Latios','latios'],[382,'Kyogre','kyogre'],[383,'Groudon','groudon'],[384,'Rayquaza','rayquaza'],[385,'Jirachi','jirachi'],[386,'Deoxys','deoxys'],[387,'Tortipouss','turtwig'],[388,'Tortipouss','grotle'],[389,'Torterra','torterra'],[390,'Ouisticram','chimchar'],[391,'Ouisticram','monferno'],[392,'Infernape','infernape'],[393,'Tiplouf','piplup'],[394,'Tiplouf','prinplup'],[395,'Émpoleon','empoleon'],[396,'Étourmi','starly'],[397,'Étourvol','staravia'],[398,'Étouraptor','staraptor'],[399,'Keunotor','bidoof'],[400,'Castorno','bibarel'],[401,'Criquette','kricketot'],[402,'Criquette','kricketune'],[403,'Lixy','shinx'],[404,'Luxio','luxio'],[405,'Luxray','luxray'],[406,'Rozbouton','budew'],[407,'Rosabyss','roserade'],[408,'Kranidos','cranidos'],[409,'Rampardos','rampardos'],[410,'Chebloche','shieldon'],[411,'Bastiodon','bastiodon'],[412,'Cheniti','burmy'],[413,'Papilord','wormadam'],[414,'Papilord','mothim'],[415,'Apitrini','combee'],[416,'Apireine','vespiquen'],[417,'Pachirisu','pachirisu'],[418,'Gobou','buizel'],[419,'Floatzel','floatzel'],[420,'Ceribou','cherubi'],[421,'Ceriflor','cherrim'],[422,'Sancoki','shellos'],[423,'Tritosor','gastrodon'],[424,'Capumain','ambipom'],[425,'Baudrive','drifloon'],[426,'Baudrive','drifblim'],[427,'Melo','buneary'],[428,'Lopunny','lopunny'],[429,'Magirêve','mismagius'],[430,'Cornèbre','honchkrow'],[431,'Chaglam','glameow'],[432,'Miaouss','purugly'],[433,'Tinnabelle','chingling'],[434,'Moufouette','stunky'],[435,'Moufflair','skuntank'],[436,'Archéomire','bronzor'],[437,'Bronzong','bronzong'],[438,'Boskara','bonsly'],[439,'Mime Jr.','mime-jr'],[440,'Ptiravi','happiny'],[441,'Étanchou','chatot'],[442,'Spiritomb','spiritomb'],[443,'Griknot','gible'],[444,'Carmache','gabite'],[445,'Carchacrok','garchomp'],[446,'Goinfrex','munchlax'],[447,'Riolu','riolu'],[448,'Lucario','lucario'],[449,'Hippopotas','hippopotas'],[450,'Hippodocus','hippowdon'],[451,'Skarabée','skorupi'],[452,'Draphly','drapion'],[453,'Croâporal','croagunk'],[454,'Toxicroak','toxicroak'],[455,'Capidextre','carnivine'],[456,'Finnéon','finneon'],[457,'Luminéon','lumineon'],[458,'Démanta','mantyke'],[459,'Blizzi','snover'],[460,'Blizzaroi','abomasnow'],[461,'Farfuret','weavile'],[462,'Magnézone','magnezone'],[463,'Excelangue','lickilicky'],[464,'Rhinoferos','rhyperior'],[465,'Feuilles','tangrowth'],[466,'Électivire','electivire'],[467,'Magmortar','magmortar'],[468,'Togekiss','togekiss'],[469,'Yanmega','yanmega'],[470,'Phyllali','leafeon'],[471,'Givrali','glaceon'],[472,'Scorvol','gliscor'],[473,'Mammochon','mamoswine'],[474,'Porygon-Z','porygon-z'],[475,'Gallame','gallade'],[476,'Tarinorme','probopass'],[477,'Ombre noire','dusknoir'],[478,'Frosme','froslass'],[479,'Motisma','rotom'],[480,'Créhelf','uxie'],[481,'Créfollet','mesprit'],[482,'Créfadet','azelf'],[483,'Dialga','dialga'],[484,'Palkia','palkia'],[485,'Heatran','heatran'],[486,'Regigigas','regigigas'],[487,'Giratina','giratina'],[488,'Cresselia','cresselia'],[489,'Phionie','phione'],[490,'Manaphy','manaphy'],[491,'Darkrai','darkrai'],[492,'Shaymin','shaymin'],[493,'Arceus','arceus'],[494,'Victini','victini'],[495,'Vipélierre','snivy'],[496,'Lianaja','servine'],[497,'Majaspic','serperior'],[498,'Gruikui','tepig'],[499,'Chaofeu','pignite'],[500,'Emboar','emboar'],[501,'Moustillon','oshawott'],[502,'Mirofulex','dewott'],[503,'Clamiral','samurott'],[504,'Ratentif','patrat'],[505,'Ratentif','watchog'],[506,'Litoubou','lillipup'],[507,'Ponchiot','herdier'],[508,'Mastouffe','stoutland'],[509,'Caninos','purrloin'],[510,'Léopardus','liepard'],[511,'Grenas','pansage'],[512,'Grenas','simisage'],[513,'Flamajou','pansear'],[514,'Flamajou','simisear'],[515,'Flotteau','panpour'],[516,'Flotteau','simipour'],[517,'Munna','munna'],[518,'Musharna','musharna'],[519,'Poichigeon','pidove'],[520,'Colombeau','tranquill'],[521,'Fédérator','unfezant'],[522,'Zébibron','blitzle'],[523,'Zébronard','zebstrika'],[524,'Géolithe','roggenrola'],[525,'Géolithe','boldore'],[526,'Gigalothe','gigalith'],[527,'Woobat','woobat'],[528,'Swoobat','swoobat'],[529,'Taupiqueur','drilbur'],[530,'Minotaupe','excadrill'],[531,'Nanméouais','audino'],[532,'Timibourin','timburr'],[533,'Bétibourin','gurdurr'],[534,'Bétibourin','conkeldurr'],[535,'Tympanot','tympole'],[536,'Batracné','palpitoad'],[537,'Crapustule','seismitoad'],[538,'Karate','throh'],[539,'Judokrak','sawk'],[540,'Larveyette','sewaddle'],[541,'Liepik','swadloon'],[542,'Liepik','leavanny'],[543,'Venipède','venipede'],[544,'Scolipède','whirlipede'],[545,'Scolipède','scolipede'],[546,'Doudouvet','cottonee'],[547,'Blancoton','whimsicott'],[548,'Lilipup','petilil'],[549,'Fragilady','lilligant'],[550,'Poissoûlet','basculin'],[551,'Sabléon','sandile'],[552,'Crocorible','krokorok'],[553,'Krookodile','krookodile'],[554,'Darumacho','darumaka'],[555,'Darumacho','darmanitan'],[556,'Maracachi','maractus'],[557,'Repcieux','dwebble'],[558,'Repcieux','crustle'],[559,'Escargaume','scraggy'],[560,'Escargaume','scrafty'],[561,'Sigilyph','sigilyph'],[562,'Tutafeh','yamask'],[563,'Tutafeh','cofagrigus'],[564,'Tirtouga','tirtouga'],[565,'Carracosta','carracosta'],[566,'Archéen','archen'],[567,'Aéroptéryx','archeops'],[568,'Skwovet','trubbish'],[569,'Garbodor','garbodor'],[570,'Zorua','zorua'],[571,'Zoroark','zoroark'],[572,'Caninos','minccino'],[573,'Chilléclat','cinccino'],[574,'Globallons','gothita'],[575,'Gothoritta','gothorita'],[576,'Gothitelle','gothitelle'],[577,'Nymphali','solosis'],[578,'Nymphali','duosion'],[579,'Réunyclus','reuniclus'],[580,'Couaneton','ducklett'],[581,'Cygnavlon','swanna'],[582,'Sorbébé','vanillite'],[583,'Sorboubou','vanillish'],[584,'Sorboubou','vanilluxe'],[585,'Deerling','deerling'],[586,'Sawsbuck','sawsbuck'],[587,'Emolga','emolga'],[588,'Karrablast','karrablast'],[589,'Escavalier','escavalier'],[590,'Foungus','foongus'],[591,'Amoonguss','amoonguss'],[592,'Viskuse','frillish'],[593,'Pieuvella','jellicent'],[594,'Mamanbo','alomomola'],[595,'Joltik','joltik'],[596,'Galvantula','galvantula'],[597,'Ferroseed','ferroseed'],[598,'Ferrothorn','ferrothorn'],[599,'Klikling','klink'],[600,'Klikling','klang'],[601,'Klinklang','klinklang'],[602,'Élecsprint','tynamo'],[603,'Ampibidou','eelektrik'],[604,'Ampibidou','eelektross'],[605,'Elgyem','elgyem'],[606,'Beheeyem','beheeyem'],[607,'Lumitrouille','litwick'],[608,'Mélancolux','lampent'],[609,'Lugulabre','chandelure'],[610,'Coupenotte','axew'],[611,'Incisicrat','fraxure'],[612,'Tranchodon','haxorus'],[613,'Cubrillo','cubchoo'],[614,'Ursaume','beartic'],[615,'Cryogonal','cryogonal'],[616,'Escargot','shelmet'],[617,'Accelgor','accelgor'],[618,'Stunfisk','stunfisk'],[619,'Mienfoo','mienfoo'],[620,'Mienshao','mienshao'],[621,'Drakkarmin','druddigon'],[622,'Duroc','golett'],[623,'Duroc','golurk'],[624,'Pawniard','pawniard'],[625,'Bisharp','bisharp'],[626,'Bouffalant','bouffalant'],[627,'Verpom','rufflet'],[628,'Gueriaigle','braviary'],[629,'Verpom','vullaby'],[630,'Mandibuzz','mandibuzz'],[631,'Heatmor','heatmor'],[632,'Skarabrute','durant'],[633,'Deino','deino'],[634,'Zweilous','zweilous'],[635,'Hydreigon','hydreigon'],[636,'Scindjass','larvesta'],[637,'Scindjass','volcarona'],[638,'Cobalion','cobalion'],[639,'Terrakion','terrakion'],[640,'Virizion','virizion'],[641,'Boréas','tornadus'],[642,'Fulguris','thundurus'],[643,'Reshiram','reshiram'],[644,'Zekrom','zekrom'],[645,'Démétéros','landorus'],[646,'Kyurem','kyurem'],[647,'Keldeo','keldeo'],[648,'Mélodie','meloetta'],[649,'Genesect','genesect']];

function sUrl(slug,anim){return anim?`https://img.pokemondb.net/sprites/black-white/anim/shiny/${slug}.gif`:`https://img.pokemondb.net/sprites/black-white/normal/${slug}.png`;}

// ── STATE ────────────────────────────────────────────
function defS(){return{
  hunts:[],history:[],activeId:null,theme:'dark',
  globalStart:Date.now(),totalElapsed:0,paused:false,
  wc:{layout:'v',m:['name','count','time'],o:['shadow','bg','anim'],bg:'#0d1117',tx:'#f0c040',sub:'#8b949e',op:90,pb:'green'},
  wl:{m:['lname','lcount','lsprite','lanim'],bg:'#0d1117',tx:'#f0c040',sub:'#8b949e',op:90,pb:'green'},
  wh:{layout:'list',m:['hname','hcount','hsprite','hanim'],nb:3,bg:'#0d1117',tx:'#f0c040',sub:'#8b949e',op:90,pb:'green'},
  presets:[],kb:{plus1:'',plus3:'',plus5:'',plus10:'',pause:'',shiny:''}
};}

let S = defS();

// ── SUPABASE API ─────────────────────────────────────
function sbHeaders(){return{'apikey':SB_KEY,'Authorization':`Bearer ${SB_KEY}`,'Content-Type':'application/json','Prefer':'return=minimal'};}

async function sbLoad(){
  try{
    const r=await fetch(`${SB_URL}/rest/v1/state?id=eq.main&select=data`,{headers:sbHeaders()});
    if(!r.ok)return false;
    const rows=await r.json();
    if(rows&&rows[0]&&rows[0].data&&Object.keys(rows[0].data).length>0){
      const loaded=rows[0].data;
      // Recalcule l'elapsed pour la chasse active avant d'écraser S
      if(loaded.hunts&&loaded.activeId&&!loaded.paused){
        const ah=loaded.hunts.find(h=>h.id===loaded.activeId&&!h.found);
        if(ah&&ah.startTime){
          // Ajoute le temps écoulé depuis le dernier save
          ah.elapsed=(ah.elapsed||0)+(Date.now()-ah.startTime);
          ah.startTime=Date.now();
        }
      }
      if(loaded.globalStart&&!loaded.paused){
        loaded.totalElapsed=(loaded.totalElapsed||0)+(Date.now()-loaded.globalStart);
        loaded.globalStart=Date.now();
      }
      S=Object.assign(defS(),loaded);
    }
    setConn(true);
    return true;
  }catch(e){setConn(false);return false;}
}

async function sbSave(){
  // Snapshot timers before saving
  const h=getAct();
  const snap=JSON.parse(JSON.stringify(S));
  if(h&&h.startTime&&!S.paused){
    const idx=snap.hunts.findIndex(x=>x.id===snap.activeId);
    if(idx>=0){snap.hunts[idx].elapsed=(snap.hunts[idx].elapsed||0)+(Date.now()-h.startTime);snap.hunts[idx].startTime=Date.now();}
  }
  try{
    const r=await fetch(`${SB_URL}/rest/v1/state?id=eq.main`,{
      method:'PATCH',headers:sbHeaders(),
      body:JSON.stringify({data:snap,updated_at:new Date().toISOString()})
    });
    setConn(r.ok);
  }catch(e){setConn(false);}
}

function scheduleSave(){
  clearTimeout(SAVE_TIMER);
  SAVE_TIMER=setTimeout(sbSave,800);
}

function setConn(ok){
  const d=document.getElementById('conn-dot');
  if(d){d.classList.toggle('off',!ok);d.title=ok?'Connecté à Supabase':'Erreur de connexion';}
}

// ── SETUP ────────────────────────────────────────────
function clearCredentials() {
  try { localStorage.removeItem('sb_url'); localStorage.removeItem('sb_key'); } catch(e) {}
  SB_URL = ''; SB_KEY = '';
  document.getElementById('sb-url').value = '';
  document.getElementById('sb-key').value = '';
  const err = document.getElementById('setup-err');
  if (err) err.style.display = 'none';
}
async function setupSupabase(){
  const url=document.getElementById('sb-url').value.trim().replace(/\/$/,'');
  const key=document.getElementById('sb-key').value.trim();
  const err=document.getElementById('setup-err');
  err.style.display='none';
  if(!url||!key){err.textContent='Remplis les deux champs.';err.style.display='block';return;}
  if(!url.startsWith('https://')){err.textContent='L\'URL doit commencer par https://';err.style.display='block';return;}

  SB_URL=url; SB_KEY=key;
  // Save credentials locally
  try{localStorage.setItem('sb_url',url);localStorage.setItem('sb_key',key);}catch(e){}

  // Show loading state
  const connectBtn = document.getElementById('connect-btn');
  if (connectBtn) { connectBtn.textContent = '⌛ Connexion...'; connectBtn.disabled = true; }

  let ok = false;
  try {
    ok = await sbLoad();
  } catch(e) {
    console.error('Connection error:', e);
  }
  
  if (connectBtn) { connectBtn.textContent = '✦ CONNECTER ET DÉMARRER'; connectBtn.disabled = false; }
  if(!ok){
    err.textContent = 'Connexion impossible. Vérifie: 1) URL Supabase correcte 2) Clé anon correcte 3) SQL exécuté dans Supabase.';
    err.style.display='block';
    SB_URL='';SB_KEY='';
    return;
  }
  bootApp();
}

function bootApp(){
  document.getElementById('setup-screen').style.display='none';
  document.getElementById('app').style.display='flex';
  applyTheme();
  renderHunts();
  renderActive();
  renderPresets();
  refreshUrls();
  // Poll Supabase every 3s for external changes
  POLL_TIMER=setInterval(async()=>{
    try{
      const r=await fetch(`${SB_URL}/rest/v1/state?id=eq.main&select=updated_at`,{headers:sbHeaders()});
      if(!r.ok)return setConn(false);
      const rows=await r.json();
      if(!rows||!rows[0])return;
      const ts=new Date(rows[0].updated_at).getTime();
      if(ts>lastSavedTs){lastSavedTs=ts;await sbLoad();renderActive();renderHunts();}
      setConn(true);
    }catch(e){setConn(false);}
  },3000);
}

// ── UTILS ────────────────────────────────────────────
function ft(ms){const s=Math.floor(ms/1000),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sc=s%60;return[h,m,sc].map(x=>String(x).padStart(2,'0')).join(':');}
function rgba(hex,op){try{const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return`rgba(${r},${g},${b},${op/100})`;}catch(e){return'transparent';}}
const PBG={green:'#00b140',blue:'#0000ff',dark:'#111',light:'#eee',transparent:'transparent'};
function applyPB(el,val){if(!el)return;if(val==='transparent'){el.style.background='';el.classList.add('checker');}else{el.classList.remove('checker');el.style.background=PBG[val]||val;}}
function getAct(){return S.hunts.find(h=>h.id===S.activeId&&!h.found);}
function getSess(){const h=getAct();return h?((h.elapsed||0)+(h.startTime&&!S.paused?Date.now()-h.startTime:0)):0;}
function getTotal(){return(S.totalElapsed||0)+(!S.paused&&S.globalStart?Date.now()-S.globalStart:0);}
function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),2200);}

// ── THEME ────────────────────────────────────────────
function toggleTheme(){S.theme=S.theme==='dark'?'light':'dark';scheduleSave();applyTheme();}
function applyTheme(){document.body.className=S.theme;const b=document.getElementById('tbtn');if(b)b.textContent=S.theme==='dark'?'☀️':'🌙';}

// ── NAV ──────────────────────────────────────────────
function nav(p){
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.p===p));
  document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id==='page-'+p));
  if(p==='widgets'){syncAllWUI();refreshPreviews();refreshUrls();}
  if(p==='historique'){renderHistPage();renderHistSelectList();}
  if(p==='stats') renderStats();
  if(p==='touches')renderKB();
}
document.querySelectorAll('.nav-btn').forEach(b=>b.addEventListener('click',()=>nav(b.dataset.p)));

function setWT(el){
  document.querySelectorAll('.wtab').forEach(b=>b.classList.toggle('active',b===el));
  document.querySelectorAll('.wpanel').forEach(p=>p.classList.toggle('active',p.id==='wp-'+el.dataset.wt));
}

// ── POKEMON SEARCH ───────────────────────────────────
let ddT=null;
function srchP(){
  clearTimeout(ddT);ddT=setTimeout(()=>{
    const q=document.getElementById('inp-n').value.toLowerCase().trim();
    const dd=document.getElementById('pdd');
    if(!q||q.length<2){dd.classList.remove('open');return;}
    const res=PKM.filter(p=>p[1].toLowerCase().includes(q)||String(p[0]).includes(q)).slice(0,20);
    if(!res.length){dd.classList.remove('open');return;}
    dd.innerHTML=res.map(p=>`<div class="po" onclick="selP(${p[0]},'${p[1].replace(/'/g,"\\'")}','${p[2]}')">
      <img src="${sUrl(p[2],false)}" alt="" onerror="this.style.display='none'">
      <span class="pname">${p[1]}</span><span class="pnum">#${String(p[0]).padStart(3,'0')}</span>
    </div>`).join('');
    dd.classList.add('open');
  },150);
}
function openDD(){if(document.getElementById('inp-n').value.length>=2)srchP();}
function selP(num,name,slug){document.getElementById('inp-n').value=name;document.getElementById('inp-s').value=slug;document.getElementById('inp-num').value=num;document.getElementById('pdd').classList.remove('open');}
document.addEventListener('click',e=>{if(!e.target.closest('.psw'))document.getElementById('pdd').classList.remove('open');});

// ── TIMER & PAUSE ────────────────────────────────────
function togglePause(){
  S.paused=!S.paused;
  playSound('pause');
  const h=getAct();
  if(S.paused){if(h&&h.startTime){h.elapsed=(h.elapsed||0)+(Date.now()-h.startTime);h.startTime=null;}S.totalElapsed=(S.totalElapsed||0)+(S.globalStart?Date.now()-S.globalStart:0);S.globalStart=null;toast('⏸ Pause');}
  else{if(h)h.startTime=Date.now();S.globalStart=Date.now();toast('▶ Reprise');}
  scheduleSave();updPauseBtn();
}
function updPauseBtn(){const b=document.getElementById('pbtn');if(!b)return;b.textContent=S.paused?'▶ Reprendre':'⏸ Pause';b.className='pbtn '+(S.paused?'pau':'run');}
function resetTotal(){if(!confirm('Timer total à zéro ?'))return;S.totalElapsed=0;S.globalStart=Date.now();scheduleSave();toast('Timer total remis à zéro');}

// ── HUNTS ────────────────────────────────────────────
function setActive(id){
  const old=getAct();if(old){old.elapsed=(old.elapsed||0)+(old.startTime?Date.now()-old.startTime:0);old.startTime=null;}
  S.activeId=id;S.paused=false;if(!S.globalStart)S.globalStart=Date.now();
  const h=S.hunts.find(h=>h.id===id);if(h){h.startTime=Date.now();if(!h.elapsed)h.elapsed=0;}
  scheduleSave();renderHunts();renderActive();updPauseBtn();
}
function addHunt(){
  const name=document.getElementById('inp-n').value.trim();if(!name){toast('❌ Choisis un Pokémon !');return;}
  const slug=document.getElementById('inp-s').value||name.toLowerCase().replace(/[^a-z0-9]/g,'-');
  const num=parseInt(document.getElementById('inp-num').value)||0;
  const method=document.getElementById('inp-m').value;
  const zone=document.getElementById('inp-z').value.trim();
  const baseO=parseInt(document.getElementById('inp-o').value);
  const charm=document.getElementById('inp-c').checked;
  const odds=(baseO===30000&&charm)?27000:(charm?1365:baseO);
  S.hunts.unshift({id:Date.now(),name,slug,num,method,zone,odds,charm,count:0,phaseCount:0,phase:1,elapsed:0,startTime:null,found:false});
  scheduleSave();renderHunts();
  ['inp-n','inp-s','inp-num','inp-z'].forEach(id=>{document.getElementById(id).value='';});
  document.getElementById('inp-c').checked=false;
  toast('✓ Chasse créée !');
}
function renderHunts(){
  const el=document.getElementById('hunt-list');if(!el)return;
  const active=S.hunts.filter(h=>!h.found);
  if(!active.length){el.innerHTML='<div class="empty-mini">Aucune chasse.</div>';return;}
  el.innerHTML=active.map(h=>{
    const isA=h.id===S.activeId;
    return`<div class="hi${isA?' act':''}">
      <div class="hi-sp"><img src="${sUrl(h.slug,false)}" alt="" onerror="this.style.display='none';this.nextSibling.style.display=''"><span style="display:none;font-size:20px;">❓</span></div>
      <div class="hi-info">
        <div class="hi-name">${h.name}${h.num?` <span style="font-size:9px;color:var(--tx3);">#${String(h.num).padStart(3,'0')}</span>`:''}</div>
        <div class="hi-sub">${h.method}${h.zone?' · '+h.zone:''}</div>
        <span class="badge ${h.charm?'bc':'bn'}">1/${h.odds.toLocaleString()}</span>
        ${isA?'<span class="badge ba" style="margin-left:4px;">● ACTIF</span>':''}
      </div>
      <div><div class="hi-cnt">${h.count.toLocaleString()}</div><div style="font-size:9px;color:var(--tx3);">rencontres</div></div>
      <div style="display:flex;flex-direction:column;gap:4px;margin-left:6px;">
        ${!isA?`<button class="btn btn-blue" style="font-size:11px;padding:5px 10px;" onclick="setActive(${h.id})">Activer</button>`:''}
        <button class="btn btn-red" style="font-size:11px;padding:5px 10px;" onclick="delHunt(${h.id})">✕</button>
      </div>
    </div>`;
  }).join('');
}
function delHunt(id){
  if(!confirm('Supprimer ?'))return;
  const h=S.hunts.find(x=>x.id===id);if(h&&h.startTime)h.elapsed=(h.elapsed||0)+(Date.now()-h.startTime);
  S.hunts=S.hunts.filter(h=>h.id!==id);if(S.activeId===id){S.activeId=null;S.paused=false;}
  scheduleSave();renderHunts();renderActive();
}
function renderActive(){
  const h=getAct();
  document.getElementById('no-hunt').style.display=h?'none':'flex';
  document.getElementById('active-hunt').style.display=h?'block':'none';
  if(!h)return;
  const anim=S.wc.o.includes('anim');
  const img=document.getElementById('h-img'),fb=document.getElementById('h-fb');
  // Reset complet avant de charger le nouveau sprite
  img.style.display='';fb.style.display='none';
  img.onload=null;img.onerror=null;
  img.onerror=function(){
    this.style.display='none';fb.style.display='';
    // Fallback: essayer sans animation
    if(this.src.includes('anim/shiny')){
      this.onerror=function(){this.style.display='none';fb.style.display='';};
      this.src=sUrl(h.slug,false);
    }
  };
  img.src=sUrl(h.slug,anim);
  document.getElementById('h-name').textContent=h.name+(h.num?' #'+String(h.num).padStart(3,'0'):'');
  document.getElementById('h-meta').textContent=`${h.method}${h.zone?' · '+h.zone:''}`;
  document.getElementById('h-tags').innerHTML=`<span class="tag to">1/${h.odds.toLocaleString()}</span><span class="tag ${h.charm?'tc':'to'}">${h.charm?'Charme Chroma':'Standard'}</span><span class="tag tp">Phase ${h.phase}</span>`;
  updPauseBtn();updCounters();
}
function updCounters(){
  const h=getAct();if(!h)return;
  document.getElementById('ctr-n').textContent=h.count.toLocaleString();
  document.getElementById('s-ph').textContent=h.phaseCount.toLocaleString();
  document.getElementById('s-phn').textContent=h.phase;
  const prob=(1-Math.pow(1-1/h.odds,h.count))*100;
  document.getElementById('s-prb').textContent=Math.min(99.99,prob).toFixed(2)+'%';
  document.getElementById('s-odd').textContent='1/'+h.odds.toLocaleString();
  document.getElementById('pbar-fill').style.width=Math.min(100,(h.count/h.odds)*50)+'%';
  document.getElementById('pl-mid').textContent='1/'+h.odds.toLocaleString();
  document.getElementById('pl-end').textContent=(h.odds*2).toLocaleString();
}
function inc(n){
  if(S.paused){toast('⏸ Timer en pause !');return;}
  const h=getAct();if(!h){toast('❌ Active une chasse !');return;}
  h.count+=n;h.phaseCount+=n;scheduleSave();updCounters();playSound('inc');
  const el=document.getElementById('ctr-n');el.classList.remove('bump');void el.offsetWidth;el.classList.add('bump');
}
function dec(){const h=getAct();if(!h||h.count<=0)return;h.count--;h.phaseCount=Math.max(0,h.phaseCount-1);scheduleSave();updCounters();}
function newPhase(){const h=getAct();if(!h)return;h.phase++;h.phaseCount=0;scheduleSave();renderActive();toast('Phase '+h.phase+' !');}
function resetPhase(){const h=getAct();if(!h||!confirm('Reset la phase ?'))return;h.phaseCount=0;scheduleSave();updCounters();}
function editCount(){const h=getAct();if(!h)return;const v=prompt('Nouveau compteur :',h.count);if(v===null)return;const n=parseInt(v);if(!isNaN(n)&&n>=0){h.count=n;scheduleSave();updCounters();}}
function foundShiny(){
  const h=getAct();if(!h)return;
  const elapsed=(h.elapsed||0)+(h.startTime&&!S.paused?Date.now()-h.startTime:0);
  S.history.unshift({id:Date.now(),name:h.name,slug:h.slug,num:h.num,count:h.count,phase:h.phase,method:h.method,zone:h.zone,date:new Date().toLocaleDateString('fr-FR'),elapsed});
  playSound('shiny');
  h.found=true;S.activeId=null;S.paused=false;
  scheduleSave();renderHunts();renderActive();
  alert(`✦ FÉLICITATIONS !\n\n${h.name} shiny après ${h.count.toLocaleString()} rencontres !`);
}

// ── HISTORIQUE ───────────────────────────────────────
// ── SHINY SELECTION ─────────────────────────────────
function renderHistSelectList(){
  const el=document.getElementById('hist-select-list');if(!el)return;
  if(!S.history.length){el.innerHTML='<div class="empty-mini">Aucun shiny encore.</div>';return;}
  el.innerHTML=S.history.map(h=>{
    const checked=!S.hiddenShinies||(S.hiddenShinies.indexOf(h.id)===-1);
    return`<label style="display:flex;align-items:center;gap:10px;padding:7px 10px;border-radius:8px;background:var(--sf2);border:1px solid var(--bd);cursor:pointer;">
      <input type="checkbox" ${checked?'checked':''} style="width:15px;height:15px;accent-color:var(--gold);" onchange="toggleShinyVisible(${h.id},this.checked)">
      <img src="${sUrl(h.slug,false)}" style="width:28px;height:28px;image-rendering:pixelated;" onerror="this.style.display='none'">
      <span style="flex:1;font-size:13px;font-weight:600;">✦ ${h.name}</span>
      <span style="font-size:11px;color:var(--tx3);">${h.date} · ${h.count.toLocaleString()} rencontres</span>
    </label>`;
  }).join('');
}
function toggleShinyVisible(id,visible){
  if(!S.hiddenShinies)S.hiddenShinies=[];
  if(visible)S.hiddenShinies=S.hiddenShinies.filter(x=>x!==id);
  else if(S.hiddenShinies.indexOf(id)===-1)S.hiddenShinies.push(id);
  scheduleSave();
}
function selectAllShiny(){S.hiddenShinies=[];scheduleSave();renderHistSelectList();toast('Tous les shinies sélectionnés');}
function deselectAllShiny(){S.hiddenShinies=S.history.map(h=>h.id);scheduleSave();renderHistSelectList();toast('Tous les shinies masqués');}

function delShiny(id){
  if(!confirm('Supprimer ce shiny de l'historique ?'))return;
  S.history=S.history.filter(h=>h.id!==id);
  scheduleSave();renderHistPage();
  toast('Shiny supprimé');
}
function renderHistPage(){
  renderHistSelectList();
  const tot=S.history.length,enc=S.history.reduce((a,h)=>a+h.count,0);
  document.getElementById('ht').textContent=tot;
  document.getElementById('he').textContent=enc.toLocaleString();
  document.getElementById('hav').textContent=tot?Math.round(enc/tot).toLocaleString():'—';
  const el=document.getElementById('hist-list');if(!el)return;
  if(!S.history.length){el.innerHTML='<div class="empty-mini">Aucun shiny encore. 🍀</div>';return;}
  el.innerHTML=S.history.map(h=>{
    const mins=Math.floor((h.elapsed||0)/60000);
    const ts=mins>60?`${Math.floor(mins/60)}h ${mins%60}m`:`${mins}m`;
    return`<div class="hitem">
      <img class="hsp2" src="${sUrl(h.slug,false)}" alt="${h.name}" onerror="this.style.display='none'">
      <div style="flex:1;"><div class="hn">✦ ${h.name}</div><div class="hs">${h.date} · ${h.method}${h.zone?' · '+h.zone:''} · Phase ${h.phase}</div></div>
      <div style="text-align:right;"><div class="hct">${h.count.toLocaleString()}</div><div class="htm">${ts}</div></div>
      <button onclick="delShiny(${h.id})" style="background:transparent;border:1px solid var(--red);color:var(--red);border-radius:6px;padding:4px 8px;cursor:pointer;font-size:11px;margin-left:8px;flex-shrink:0;">✕</button>
    </div>`;
  }).join('');
}

// ── WIDGET CONFIGS ───────────────────────────────────
function wSet(cfg,field,el){
  document.querySelectorAll(`#${cfg}-${field==='layout'?'layout':field==='pb'?'pb':'nb'} .chip`).forEach(c=>c.classList.remove('on'));
  el.classList.add('on');S[cfg][field]=field==='nb'?parseInt(el.dataset.v):el.dataset.v;
  scheduleSave();refreshPreviews();refreshUrls();
}
function wT(cfg,type,el){
  el.classList.toggle('on');
  const k=type==='m'?'m':'o';
  const gid=`${cfg}-${type==='m'?'metrics':'opts'}`;
  S[cfg][k]=[...document.querySelectorAll('#'+gid+' .chip.on')].map(c=>c.dataset.v);
  scheduleSave();if(cfg==='wc')renderActive();refreshPreviews();
}
function wC(cfg){
  S[cfg].bg=document.getElementById(cfg+'-bg').value;
  S[cfg].tx=document.getElementById(cfg+'-tx').value;
  S[cfg].sub=document.getElementById(cfg+'-sub').value;
  S[cfg].op=parseInt(document.getElementById(cfg+'-op').value);
  scheduleSave();refreshPreviews();
}
function syncC(cfg){
  Object.assign(S[cfg],{bg:S.wc.bg,tx:S.wc.tx,sub:S.wc.sub,op:S.wc.op});
  ['bg','tx','sub'].forEach(k=>{const el=document.getElementById(cfg+'-'+k);if(el)el.value=S[cfg][k];});
  const op=document.getElementById(cfg+'-op');if(op){op.value=S[cfg].op;document.getElementById(cfg+'-opv').textContent=S[cfg].op;}
  scheduleSave();refreshPreviews();toast('Couleurs synchronisées !');
}
function syncAllWUI(){
  ['wc','wl','wh'].forEach(cfg=>{
    if(S[cfg].layout)document.querySelectorAll(`#${cfg}-layout .chip`).forEach(c=>c.classList.toggle('on',c.dataset.v===S[cfg].layout));
    if(S[cfg].m)document.querySelectorAll(`#${cfg}-metrics .chip`).forEach(c=>c.classList.toggle('on',S[cfg].m.includes(c.dataset.v)));
    if(S[cfg].o)document.querySelectorAll(`#${cfg}-opts .chip`).forEach(c=>c.classList.toggle('on',S[cfg].o.includes(c.dataset.v)));
    if(S[cfg].nb)document.querySelectorAll(`#${cfg}-nb .chip`).forEach(c=>c.classList.toggle('on',c.dataset.v===String(S[cfg].nb)));
    document.querySelectorAll(`#${cfg}-pb .chip`).forEach(c=>c.classList.toggle('on',c.dataset.v===S[cfg].pb));
    ['bg','tx','sub'].forEach(k=>{const el=document.getElementById(`${cfg}-${k}`);if(el)el.value=S[cfg][k];});
    const op=document.getElementById(`${cfg}-op`);if(op){op.value=S[cfg].op;const l=document.getElementById(`${cfg}-opv`);if(l)l.textContent=S[cfg].op;}
  });
  renderPresets();
}

// ── PRESETS ──────────────────────────────────────────
function savePreset(){S.presets.push({bg:S.wc.bg,tx:S.wc.tx,sub:S.wc.sub,op:S.wc.op});scheduleSave();renderPresets();toast('💾 Préset sauvegardé !');}
function loadPreset(i){const p=S.presets[i];if(!p)return;Object.assign(S.wc,{bg:p.bg,tx:p.tx,sub:p.sub,op:p.op});['bg','tx','sub'].forEach(k=>{const el=document.getElementById('wc-'+k);if(el)el.value=S.wc[k];});const op=document.getElementById('wc-op');if(op){op.value=S.wc.op;document.getElementById('wc-opv').textContent=S.wc.op;}scheduleSave();refreshPreviews();toast('Préset chargé !');}
function delPreset(i,e){e.stopPropagation();S.presets.splice(i,1);scheduleSave();renderPresets();}
function renderPresets(){const w=document.getElementById('wc-pres');if(!w)return;w.innerHTML=S.presets.length?S.presets.map((p,i)=>`<div class="psw2" onclick="loadPreset(${i})" style="background:linear-gradient(135deg,${p.bg} 50%,${p.tx} 50%);"><div class="dx" onclick="delPreset(${i},event)">✕</div></div>`).join(''):'<span style="font-size:11px;color:var(--tx3);">Aucun préset.</span>';}

// ── PREVIEW HTML BUILDERS ────────────────────────────
function buildChaseHTML(){
  const h=getAct(),cfg=S.wc;
  const anim=cfg.o.includes('anim'),hasBg=cfg.o.includes('bg'),hasShadow=cfg.o.includes('shadow'),hideSprite=cfg.o.includes('hsprite');
  const show=k=>cfg.m.includes(k);
  const slug=h?h.slug:'';
  const sess=getSess(),total=getTotal();
  const prob=h?((1-Math.pow(1-1/h.odds,h.count))*100).toFixed(1)+'%':'0%';
  const lc=cfg.layout==='h'?'wh':cfg.layout==='hf'?'whf':'wv';
  const bgSt=hasBg?`background:${rgba(cfg.bg,cfg.op)};border-color:${cfg.tx};border-width:2px;`:'border:none;background:transparent;';
  let o=`<div class="wgt ${lc}${hasShadow?' sh':''}" style="${bgSt}">`;
  if(!hideSprite&&cfg.layout!=='count'&&cfg.layout!=='time'&&slug)o+=`<img src="${sUrl(slug,anim)}" style="width:56px;height:56px;" onerror="this.style.display='none'">`;
  if(cfg.layout!=='sprite'){
    o+=`<div>`;
    if(show('name'))o+=`<div class="wpn" style="color:${cfg.tx};">${h?h.name.toUpperCase():'EN CHASSE'}</div>`;
    if(show('count')&&cfg.layout!=='time')o+=`<div class="wpc" style="color:${cfg.tx};">${h?h.count.toLocaleString():'0'}</div>`;
    if(show('time')&&cfg.layout!=='count')o+=`<div class="wps" style="color:${cfg.sub};">⏱ ${ft(sess)}</div>`;
    if(show('totaltime'))o+=`<div class="wps" style="color:${cfg.sub};">⏱ Tot. ${ft(total)}</div>`;
    if(show('phase'))o+=`<div class="wps" style="color:${cfg.sub};">Phase ${h?h.phase:1}</div>`;
    if(show('prob'))o+=`<div class="wps" style="color:${cfg.sub};">Proba: ${prob}</div>`;
    o+=`</div>`;
  }
  return o+`</div>`;
}
function buildListHTML(){
  const cfg=S.wl,active=S.hunts.filter(h=>!h.found);
  const sA=cfg.m.includes('lanim'),sSp=cfg.m.includes('lsprite'),sN=cfg.m.includes('lname'),sC=cfg.m.includes('lcount'),sPh=cfg.m.includes('lphase'),sT=cfg.m.includes('ltime'),sTT=cfg.m.includes('ltotaltime');
  const total=getTotal();
  if(!active.length)return`<div class="wlist" style="background:${rgba(cfg.bg,cfg.op)};border-color:${cfg.tx};"><div style="font-size:11px;color:${cfg.sub};padding:4px;">Aucune chasse active</div></div>`;
  let o=`<div class="wlist" style="background:${rgba(cfg.bg,cfg.op)};border-color:${cfg.tx};">`;
  active.forEach(h=>{
    const hs=(h.elapsed||0)+(h.startTime&&!S.paused?Date.now()-h.startTime:0);const isA=h.id===S.activeId;
    o+=`<div class="wli">`;
    if(sSp)o+=`<img src="${sUrl(h.slug,sA)}" style="width:34px;height:34px;" onerror="this.style.display='none'">`;
    o+=`<div style="flex:1;min-width:0;">`;
    if(sN)o+=`<div style="font-size:12px;font-weight:600;color:${isA?cfg.tx:'#aaa'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${isA?'● ':''}${h.name}</div>`;
    if(sPh)o+=`<div style="font-size:10px;color:${cfg.sub};">Phase ${h.phase}</div>`;
    if(sT)o+=`<div style="font-size:10px;color:${cfg.sub};">⏱ ${ft(hs)}</div>`;
    if(sTT)o+=`<div style="font-size:10px;color:${cfg.sub};">⏱ Tot. ${ft(total)}</div>`;
    o+=`</div>`;
    if(sC)o+=`<div class="wlc" style="color:${cfg.tx};">${h.count.toLocaleString()}</div>`;
    o+=`</div>`;
  });
  return o+`</div>`;
}
function buildHistHTML(){
  const cfg=S.wh;
  const hidden=S.hiddenShinies||[];
  const items=S.history.filter(h=>hidden.indexOf(h.id)===-1).slice(0,cfg.nb||3);
  const sA=cfg.m.includes('hanim'),sSp=cfg.m.includes('hsprite'),sN=cfg.m.includes('hname'),sC=cfg.m.includes('hcount'),sD=cfg.m.includes('hdate'),sT=cfg.m.includes('htime'),sPh=cfg.m.includes('hphase');
  const layout=cfg.layout||'list';
  if(!items.length)return`<div class="whist" style="background:${rgba(cfg.bg,cfg.op)};border-color:${cfg.tx};"><div style="font-size:11px;color:${cfg.sub};padding:6px;">Aucun shiny encore...</div></div>`;
  if(layout==='last1'){const h=items[0];let o=`<div class="whist" style="background:${rgba(cfg.bg,cfg.op)};border-color:${cfg.tx};align-items:center;text-align:center;gap:6px;">`;if(sSp)o+=`<img src="${sUrl(h.slug,sA)}" style="width:56px;height:56px;" onerror="this.style.display='none'">`;if(sN)o+=`<div class="wpn" style="color:${cfg.tx};">✦ ${h.name}</div>`;if(sC)o+=`<div class="wpc" style="color:${cfg.tx};">${h.count.toLocaleString()}</div>`;if(sD)o+=`<div style="font-size:10px;color:${cfg.sub};">${h.date}</div>`;return o+`</div>`;}
  const isCard=layout==='cards',isH=layout==='horizontal';
  let o=`<div class="whist${isCard||isH?' wh':''}" style="background:${rgba(cfg.bg,cfg.op)};border-color:${cfg.tx};">`;
  items.forEach(h=>{
    const mins=Math.floor((h.elapsed||0)/60000);const ts=mins>60?`${Math.floor(mins/60)}h ${mins%60}m`:`${mins}m`;
    if(isCard){o+=`<div class="whc">`;if(sSp)o+=`<img src="${sUrl(h.slug,sA)}" style="width:38px;height:38px;" onerror="this.style.display='none'">`;if(sN)o+=`<div style="font-size:10px;font-weight:700;color:${cfg.tx};">✦ ${h.name}</div>`;if(sC)o+=`<div style="font-family:'Press Start 2P',monospace;font-size:10px;color:${cfg.tx};">${h.count.toLocaleString()}</div>`;if(sD)o+=`<div style="font-size:9px;color:${cfg.sub};">${h.date}</div>`;o+=`</div>`;}
    else{o+=`<div class="whi">`;if(sSp)o+=`<img src="${sUrl(h.slug,sA)}" style="width:34px;height:34px;" onerror="this.style.display='none'">`;o+=`<div style="flex:1;min-width:0;">`;if(sN)o+=`<div style="font-size:11px;font-weight:700;color:${cfg.tx};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">✦ ${h.name}</div>`;if(sD)o+=`<div style="font-size:9px;color:${cfg.sub};">${h.date}${sPh?' • Ph.'+h.phase:''}</div>`;if(sT)o+=`<div style="font-size:9px;color:${cfg.sub};">⏱ ${ts}</div>`;o+=`</div>`;if(sC)o+=`<div style="font-family:'Press Start 2P',monospace;font-size:11px;color:${cfg.tx};white-space:nowrap;">${h.count.toLocaleString()}</div>`;o+=`</div>`;}
  });
  return o+`</div>`;
}
function refreshPreviews(){
  const pw=document.getElementById('prev-wc');if(pw){applyPB(pw,S.wc.pb);pw.innerHTML=buildChaseHTML();}
  const pl=document.getElementById('prev-wl');if(pl){applyPB(pl,S.wl.pb||'green');pl.innerHTML=buildListHTML();}
  const ph=document.getElementById('prev-wh');if(ph){applyPB(ph,S.wh.pb||'green');ph.innerHTML=buildHistHTML();}
}

// ── URLS ─────────────────────────────────────────────
function getWgtUrl(type){
  const base=location.href.split('/').slice(0,-1).join('/')+'/widget.html';
  const u=encodeURIComponent(SB_URL);const k=encodeURIComponent(SB_KEY);
  return`${base}?t=${type}&u=${u}&k=${k}`;
}
function refreshUrls(){
  const map={wc:'chase',wl:'list',wh:'history'};
  Object.entries(map).forEach(([k,t])=>{const el=document.getElementById(`${k}-url`);if(el)el.textContent=getWgtUrl(t);});
}
function copyU(cfg){
  const map={wc:'chase',wl:'list',wh:'history'};
  const url=getWgtUrl(map[cfg]);
  navigator.clipboard.writeText(url).then(()=>toast('✓ URL copiée ! Colle dans OBS → Source Navigateur')).catch(()=>{toast('Sélectionne et copie l\'URL manuellement');});
}


// ═══════════════════════════════════════
// STATISTICS
// ═══════════════════════════════════════
function renderStats() {
  const hist = S.history;
  const hunts = S.hunts;
  const odds = 30000; // PokeMMO default

  // KPIs
  const total = hist.length;
  const enc = hist.reduce((a,h)=>a+h.count, 0);
  const avg = total ? Math.round(enc/total) : 0;
  const activeHunts = hunts.filter(h=>!h.found).length;
  const doneHunts = hunts.filter(h=>h.found).length + total;

  // Luck: avg vs theoretical
  const theoryOdds = S.wc && S.wc ? 30000 : 30000;
  const luckPct = avg ? Math.round((theoryOdds / avg) * 100) : null;
  const luckStr = luckPct ? (luckPct > 100 ? `🍀 ${luckPct}%` : `😬 ${luckPct}%`) : '—';

  const best = total ? hist.reduce((a,b)=>a.count<b.count?a:b) : null;
  const worst = total ? hist.reduce((a,b)=>a.count>b.count?a:b) : null;

  setText('st-total', total);
  setText('st-enc', enc.toLocaleString());
  setText('st-avg', avg ? avg.toLocaleString() : '—');
  setText('st-luck', luckStr);
  setText('st-best', best ? `${best.name} (${best.count.toLocaleString()})` : '—');
  setText('st-worst', worst ? `${worst.name} (${worst.count.toLocaleString()})` : '—');
  setText('st-hunts-done', doneHunts);
  setText('st-active', activeHunts);

  renderEncountersChart();
  renderLuckChart();
  renderProgressChart();
  renderMethodsChart();
  renderPokemonChart();
  renderStatsTable();
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function barChart(containerId, items, colorFn) {
  const el = document.getElementById(containerId);
  if (!el || !items.length) { if(el) el.innerHTML='<div style="color:var(--tx3);font-size:12px;padding:8px;">Pas encore de données</div>'; return; }
  const max = Math.max(...items.map(i=>i.value));
  el.innerHTML = items.map(item => {
    const pct = max > 0 ? (item.value / max * 100) : 0;
    const color = colorFn ? colorFn(item) : 'var(--gold)';
    return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
      <div style="width:100px;font-size:11px;color:var(--tx2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:right;flex-shrink:0;">${item.label}</div>
      <div style="flex:1;background:var(--sf3);border-radius:4px;height:20px;position:relative;overflow:hidden;">
        <div style="position:absolute;left:0;top:0;height:100%;width:${pct}%;background:${color};border-radius:4px;transition:width .5s;"></div>
        <div style="position:absolute;right:6px;top:50%;transform:translateY(-50%);font-size:10px;font-weight:700;color:var(--tx);font-family:'Press Start 2P',monospace;">${item.display||item.value.toLocaleString()}</div>
      </div>
    </div>`;
  }).join('');
}

function renderEncountersChart() {
  const items = S.history.slice(0,10).map(h=>({
    label: h.name,
    value: h.count,
    display: h.count.toLocaleString()
  }));
  barChart('chart-encounters', items, i => 'var(--gold)');
}

function renderLuckChart() {
  const items = S.history.slice(0,10).map(h=>{
    const luck = (30000 / h.count) * 100;
    return {
      label: h.name,
      value: Math.round(luck),
      display: Math.round(luck)+'%',
      lucky: luck >= 100
    };
  });
  barChart('chart-luck', items, i => i.lucky ? 'var(--green)' : 'var(--red)');
}

function renderProgressChart() {
  const h = getAct();
  const el = document.getElementById('chart-progress');
  if (!el) return;
  if (!h) { el.innerHTML='<div style="color:var(--tx3);font-size:12px;padding:8px;">Aucune chasse active</div>'; return; }
  
  const odds = h.odds;
  const count = h.count;
  const prob = (1-Math.pow(1-1/odds, count))*100;
  const expectedAt50 = Math.round(odds * Math.log(2));
  
  // Mini timeline: jalons de probabilité
  const milestones = [
    {pct:25, enc:Math.round(-odds*Math.log(0.75)), label:'25%'},
    {pct:50, enc:expectedAt50, label:'50%'},
    {pct:75, enc:Math.round(-odds*Math.log(0.25)), label:'75%'},
    {pct:90, enc:Math.round(-odds*Math.log(0.10)), label:'90%'},
  ];
  
  el.innerHTML = `
    <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:16px;">
      <div style="background:var(--sf2);border:1px solid var(--bd);border-radius:8px;padding:10px 14px;text-align:center;">
        <div style="font-family:'Press Start 2P',monospace;font-size:14px;color:var(--gold);">${count.toLocaleString()}</div>
        <div style="font-size:11px;color:var(--tx3);margin-top:3px;">Rencontres</div>
      </div>
      <div style="background:var(--sf2);border:1px solid var(--bd);border-radius:8px;padding:10px 14px;text-align:center;">
        <div style="font-family:'Press Start 2P',monospace;font-size:14px;color:${prob>75?'var(--red)':prob>50?'var(--gold)':'var(--green)'};">${prob.toFixed(1)}%</div>
        <div style="font-size:11px;color:var(--tx3);margin-top:3px;">Probabilité</div>
      </div>
      <div style="background:var(--sf2);border:1px solid var(--bd);border-radius:8px;padding:10px 14px;text-align:center;">
        <div style="font-family:'Press Start 2P',monospace;font-size:14px;color:var(--blue);">${expectedAt50.toLocaleString()}</div>
        <div style="font-size:11px;color:var(--tx3);margin-top:3px;">Médiane (50%)</div>
      </div>
      <div style="background:var(--sf2);border:1px solid var(--bd);border-radius:8px;padding:10px 14px;text-align:center;">
        <div style="font-family:'Press Start 2P',monospace;font-size:14px;color:var(--purple);">${count>expectedAt50?'😬 Dur':'🍀 OK'}</div>
        <div style="font-size:11px;color:var(--tx3);margin-top:3px;">Par rapport à la médiane</div>
      </div>
    </div>
    <div style="font-size:11px;color:var(--tx3);margin-bottom:8px;">Jalons de probabilité pour <strong style="color:var(--tx);">${h.name}</strong> (1/${odds.toLocaleString()})</div>
    ${milestones.map(m=>{
      const reached = count >= m.enc;
      return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
        <div style="width:36px;font-size:11px;font-weight:700;color:${reached?'var(--green)':'var(--tx3)'};">${m.label}</div>
        <div style="flex:1;background:var(--sf3);border-radius:4px;height:18px;position:relative;overflow:hidden;">
          <div style="position:absolute;left:0;top:0;height:100%;width:${m.pct}%;background:${reached?'var(--green)':'var(--bd2)'};border-radius:4px;"></div>
          <div style="position:absolute;right:6px;top:50%;transform:translateY(-50%);font-size:10px;color:var(--tx);">${m.enc.toLocaleString()} enc.</div>
          ${reached?'<div style="position:absolute;left:6px;top:50%;transform:translateY(-50%);font-size:10px;color:#000;">✓ Atteint</div>':''}
        </div>
      </div>`;
    }).join('')}`;
}

function renderMethodsChart() {
  const methods = {};
  S.history.forEach(h=>{ methods[h.method]=(methods[h.method]||0)+1; });
  const items = Object.entries(methods).sort((a,b)=>b[1]-a[1]).map(([k,v])=>({label:k,value:v}));
  barChart('chart-methods', items, ()=>'var(--blue)');
}

function renderPokemonChart() {
  // Count all hunts (done + active)
  const pokes = {};
  S.history.forEach(h=>{ pokes[h.name]=(pokes[h.name]||0)+1; });
  S.hunts.filter(h=>!h.found).forEach(h=>{ pokes[h.name]=(pokes[h.name]||0); });
  const items = Object.entries(pokes).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v])=>({label:k,value:v,display:v+' fois'}));
  barChart('chart-pokemon', items, ()=>'var(--purple)');
}

function renderStatsTable() {
  const el = document.getElementById('stats-table');
  if (!el || !S.history.length) { if(el) el.innerHTML='<tr><td style="padding:12px;color:var(--tx3);font-size:12px;">Aucune donnée</td></tr>'; return; }
  el.innerHTML = `
    <thead>
      <tr style="border-bottom:1px solid var(--bd);">
        <th style="padding:8px;text-align:left;font-size:11px;color:var(--tx2);font-weight:600;">Pokémon</th>
        <th style="padding:8px;text-align:center;font-size:11px;color:var(--tx2);font-weight:600;">Rencontres</th>
        <th style="padding:8px;text-align:center;font-size:11px;color:var(--tx2);font-weight:600;">Taux</th>
        <th style="padding:8px;text-align:center;font-size:11px;color:var(--tx2);font-weight:600;">Chance</th>
        <th style="padding:8px;text-align:center;font-size:11px;color:var(--tx2);font-weight:600;">Durée</th>
        <th style="padding:8px;text-align:center;font-size:11px;color:var(--tx2);font-weight:600;">Phase</th>
        <th style="padding:8px;text-align:center;font-size:11px;color:var(--tx2);font-weight:600;">Date</th>
        <th style="padding:8px;text-align:center;font-size:11px;color:var(--tx2);font-weight:600;"></th>
      </tr>
    </thead>
    <tbody>
      ${S.history.map(h=>{
        const odds = h.odds || 30000;
        const luck = Math.round((odds/h.count)*100);
        const luckColor = luck>=100?'var(--green)':'var(--red)';
        const mins = Math.floor((h.elapsed||0)/60000);
        const ts = mins>60 ? Math.floor(mins/60)+'h '+mins%60+'m' : mins+'m';
        return `<tr style="border-bottom:1px solid var(--bd);">
          <td style="padding:8px;font-size:12px;font-weight:600;">
            <div style="display:flex;align-items:center;gap:8px;">
              <img src="${sUrl(h.slug,false)}" style="width:24px;height:24px;image-rendering:pixelated;" onerror="this.style.display='none'">
              ✦ ${h.name}
            </div>
          </td>
          <td style="padding:8px;text-align:center;font-family:'Press Start 2P',monospace;font-size:11px;color:var(--gold);">${h.count.toLocaleString()}</td>
          <td style="padding:8px;text-align:center;font-size:11px;color:var(--tx2);">1/${(h.odds||30000).toLocaleString()}</td>
          <td style="padding:8px;text-align:center;font-size:11px;font-weight:700;color:${luckColor};">${luck}%</td>
          <td style="padding:8px;text-align:center;font-size:11px;color:var(--tx2);">${ts}</td>
          <td style="padding:8px;text-align:center;font-size:11px;color:var(--tx2);">Phase ${h.phase}</td>
          <td style="padding:8px;text-align:center;font-size:11px;color:var(--tx2);">${h.date}</td>
          <td style="padding:8px;text-align:center;">
            <button onclick="delShiny(${h.id})" style="background:transparent;border:1px solid var(--red);color:var(--red);border-radius:6px;padding:3px 8px;cursor:pointer;font-size:11px;">✕</button>
          </td>
        </tr>`;
      }).join('')}
    </tbody>`;
}

// ── KEYBINDS ─────────────────────────────────────────
const KBDEFS=[{key:'plus1',label:'+1 rencontre',desc:'Ajoute 1 rencontre'},{key:'plus3',label:'+3 rencontres',desc:'Ajoute 3 rencontres'},{key:'plus5',label:'+5 rencontres',desc:'Ajoute 5 rencontres'},{key:'plus10',label:'+10 rencontres',desc:'Ajoute 10 rencontres'},{key:'pause',label:'⏸ Pause / Reprendre',desc:'Gèle le timer'},{key:'shiny',label:'✦ Shiny trouvé !',desc:'Enregistre la capture'}];
const KBACT={plus1:()=>inc(1),plus3:()=>inc(3),plus5:()=>inc(5),plus10:()=>inc(10),pause:()=>togglePause(),shiny:()=>{if(confirm('Confirmer shiny trouvé ?'))foundShiny();}};
let lK=null;
function renderKB(){
  const el=document.getElementById('kb-list');if(!el)return;
  el.innerHTML=KBDEFS.map(d=>{const cur=S.kb[d.key]||'';return`<div class="kbr"><div class="kbi"><div class="kbn">${d.label}</div><div class="kbd2">${d.desc}</div></div><div style="display:flex;align-items:center;gap:8px;"><div class="kbk${lK===d.key?' lst':cur?' set':''}" onclick="startKB('${d.key}')">${lK===d.key?'Appuie...':(cur||'— Assigner —')}</div>${cur?`<button class="btn-ghost btn-xs" onclick="clearKB('${d.key}')">✕</button>`:''}</div></div>`;}).join('');
}
function startKB(k){lK=k;renderKB();toast('Appuie sur la touche...');}
function clearKB(k){S.kb[k]='';lK=null;scheduleSave();renderKB();}
function resetKB(){S.kb={plus1:'',plus3:'',plus5:'',plus10:'',pause:'',shiny:''};lK=null;scheduleSave();renderKB();toast('Touches réinitialisées');}
document.addEventListener('keydown',e=>{
  if(lK!==null){e.preventDefault();const kn=e.key===' '?'Espace':e.key==='Control'?'Ctrl':e.key==='Shift'?'Shift':e.key==='Alt'?'Alt':e.key.length===1?e.key.toUpperCase():e.key;S.kb[lK]=kn;lK=null;scheduleSave();renderKB();toast('Touche: '+kn);return;}
  if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT')return;
  const pk=e.key===' '?'Espace':e.key.length===1?e.key.toUpperCase():e.key;
  KBDEFS.forEach(d=>{if(S.kb[d.key]&&S.kb[d.key]===pk){e.preventDefault();KBACT[d.key]();}});
});

// ── TIMER LOOP ───────────────────────────────────────
setInterval(()=>{
  if(!S.paused){
    const gt=document.getElementById('t-global');if(gt)gt.textContent=ft(getTotal());
    const ts=document.getElementById('t-sess');if(ts)ts.textContent=ft(getSess());
    const tt=document.getElementById('t-total');if(tt)tt.textContent=ft(getTotal());
    const ap=document.querySelector('.page.active');
    if(ap&&ap.id==='page-widgets')refreshPreviews();
  if(ap&&ap.id==='page-stats')renderStats();
  }
},1000);

// ── AUTO-CONNECT if credentials saved ───────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Load sound pref
  try {
    const sp = localStorage.getItem('sound_enabled');
    if (sp !== null) {
      soundEnabled = sp === 'true';
      const btn = document.getElementById('sound-btn');
      if (btn) btn.textContent = soundEnabled ? '🔔' : '🔕';
    }
  } catch(e) {}

  // Try auto-connect
  try {
    const url = localStorage.getItem('sb_url');
    const key = localStorage.getItem('sb_key');
    if (url && key) {
      SB_URL = url; SB_KEY = key;
      const elUrl = document.getElementById('sb-url');
      const elKey = document.getElementById('sb-key');
      if (elUrl) elUrl.value = url;
      if (elKey) elKey.value = key;
      const ok = await sbLoad();
      if (ok) { bootApp(); return; }
      // If auto-connect fails, clear and show setup
      SB_URL = ''; SB_KEY = '';
      const err = document.getElementById('setup-err');
      if (err) {
        err.textContent = 'Reconnexion automatique échouée. Re-entre tes identifiants Supabase.';
        err.style.display = 'block';
      }
    }
  } catch(e) {
    console.error('Auto-connect error:', e);
  }
});
