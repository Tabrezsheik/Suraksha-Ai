/**
 * SURAKSHA AI — Authoritative Legal Study Tutor & Case Study Service
 * 
 * Provides:
 * 1. Statutory Resolution Engine (Acts, Sections, Headings, India Code URLs)
 * 2. 8-Part Structured Legal Tutoring Curriculum (Section 6 of requirements)
 * 3. Verified Real Legal Case Study Retrieval from PostgreSQL
 * 4. Interactive Quizzes & Continuity Tracking
 * 5. Multilingual explanations (English, Telugu, Hindi)
 * 6. Explicit Grounding: Never fabricates cases or citations. If unverified, clearly labels hypothetical.
 */

const assistantDbService = require('./assistantDbService');

// Verified Statutory Knowledge Base with Official India Code Identifiers
const STATUTORY_SECTIONS = {
  'pwdva': {
    actName: 'Protection of Women from Domestic Violence Act, 2005',
    actIdentifier: 'PWDVA',
    maxSection: 37,
    jurisdiction: 'India (Central Legislation)',
    indiaCodeUrl: 'https://www.indiacode.nic.in/handle/123456789/2021',
    sections: {
      '3': {
        sectionNumber: '3',
        heading: 'Definition of domestic violence',
        status: 'Active & In Force',
        simpleMeaning: 'Section 3 provides an exhaustive definition of domestic violence. Any act, omission, commission, or conduct of the respondent constitutes domestic violence if it harms, injures, or endangers the health, safety, life, limb, or well-being (mental or physical) of the aggrieved person. It expressly encompasses physical abuse, sexual abuse, verbal and emotional abuse, and economic abuse.',
        keyPoints: [
          'Physical Abuse: Any act or conduct causing bodily pain, harm, or danger to life, limb, or health, or impairing health or development.',
          'Sexual Abuse: Any conduct of a sexual nature that abuses, humiliates, degrades, or otherwise violates the dignity of a woman.',
          'Verbal and Emotional Abuse: Insults, ridicule, humiliation, name-calling, and insults specifically relating to not having children or male children.',
          'Economic Abuse: Deprivation of financial resources, disposal of household effects, or alienation of assets to which the aggrieved person is entitled.',
          'Dowry Harassment: Harassing, harming, or injuring the aggrieved person with a view to coercing her or her relatives to meet unlawful demands for dowry or property.'
        ],
        hypotheticalExample: '[HYPOTHETICAL EDUCATIONAL SCENARIO — Not a court judgment]\nSunita faces constant insults and humiliation from her marital family for not bringing adequate dowry, and her husband withholds grocery money and locks away her personal bank documents. Even without physical beatings, this conduct squarely constitutes domestic violence under Section 3 (verbal, emotional, and economic abuse), entitling Sunita to seek immediate protection and monetary relief from a Magistrate.',
        examNotes: [
          'Core Ingredients: Physical, Sexual, Verbal/Emotional, and Economic Abuse (all four sub-clauses under Section 3).',
          'Landmark Authority: Indra Sarma v. V.K.V. Sarma (2013) 15 SCC 755 (guidelines on domestic relationships and scope of domestic violence).',
          'Constitutional Dimension: Hiralal P. Harsora v. Kusum Narottam Harsora (2016) 10 SCC 165 struck down the words "adult male" in Section 2(q), allowing complaints against female relatives as well.'
        ],
        quizQuestions: [
          {
            id: 'pwdva_3_q1',
            question: 'Under Section 3 of PWDVA, which of the following forms of conduct constitutes domestic violence?',
            options: {
              A: 'Physical abuse only',
              B: 'Physical and sexual abuse only',
              C: 'Physical, sexual, verbal, emotional, and economic abuse',
              D: 'Only violence that causes visible grievous injuries'
            },
            correct: 'C',
            explanation: 'Section 3 of PWDVA explicitly covers physical abuse, sexual abuse, verbal and emotional abuse, and economic abuse.'
          },
          {
            id: 'pwdva_3_q2',
            question: 'Does depriving an aggrieved woman of financial resources to which she is entitled constitute domestic violence under Section 3?',
            options: {
              A: 'No, financial matters are purely civil and outside PWDVA',
              B: 'Yes, it constitutes economic abuse under Section 3(a) read with Explanation I(iv)',
              C: 'Only if there is an existing divorce decree',
              D: 'Only if the property is registered in her sole name'
            },
            correct: 'B',
            explanation: 'Explanation I(iv) to Section 3 explicitly includes deprivation of all or any economic or financial resources as economic abuse.'
          }
        ],
        telugu: {
          meaning: 'సెక్షన్ 3 గృహహింసను సమగ్రంగా నిర్వచిస్తుంది. శారీరక, లైంగిక, మానసిక, మరియు ఆర్థిక హింసలు దీని పరిధిలోకి వస్తాయి. మహిళ ఆరోగ్యం, భద్రత, లేదా గౌరవానికి భంగం కలిగించే ఏ చర్యనైనా గృహహింసగా పరిగణిస్తారు.',
          keyPoints: '1. శారీరక మరియు లైంగిక దాడి మాత్రమే కాక, మాటలతో కించపరచడం మరియు ఆర్థిక వనరులను నిరాకరించడం కూడా గృహహింస కిందకే వస్తుంది.\n2. వరకట్న వేధింపులు కూడా ఈ నిర్వచనంలో స్పష్టంగా చేర్చబడ్డాయి.'
        },
        hindi: {
          meaning: 'धारा 3 घरेलू हिंसा को विस्तृत रूप से परिभाषित करती है। इसमें शारीरिक, यौन, मौखिक और भावनात्मक, तथा आर्थिक दुर्व्यवहार शामिल हैं। महिला के स्वास्थ्य, सुरक्षा या गरिमा को ठेस पहुँचाने वाला कोई भी कृत्य घरेलू हिंसा है।',
          keyPoints: '1. शारीरिक चोट के अलावा अपशब्द कहना, अपमानित करना या वित्तीय संसाधनों से वंचित करना भी घरेलू हिंसा है।\n2. दहेज की अवैध मांग के लिए प्रताड़ित करना धारा 3 के अंतर्गत स्पष्ट अपराध है।'
        }
      },
      '12': {
        sectionNumber: '12',
        heading: 'Application to Magistrate',
        status: 'Active & In Force',
        simpleMeaning: 'Section 12 is the primary procedural gateway under PWDVA. An aggrieved person, a Protection Officer, or any other person on behalf of the aggrieved person may present an application to the Judicial Magistrate seeking one or more reliefs under the Act (such as protection, residence, monetary relief, custody, or compensation).',
        keyPoints: [
          'Relief Gateway: Allows combining multiple reliefs (Sections 18, 19, 20, 21, 22) in a single application.',
          'Domestic Incident Report (DIR): The Magistrate shall take into consideration any domestic incident report submitted by the Protection Officer or service provider.',
          'Speedy Trial: The first hearing date must not exceed 3 days from receipt of application; the Magistrate shall endeavor to dispose of the application within 60 days.'
        ],
        hypotheticalExample: '[HYPOTHETICAL EDUCATIONAL SCENARIO — Not a court judgment]\nA victim of domestic violence approaches a Protection Officer, who drafts a Domestic Incident Report and files an application under Section 12 before the Judicial Magistrate. The Magistrate fixes the first hearing within 3 days and issues urgent notices to prevent irreparable harm.',
        examNotes: [
          'Statutory Timeline: 3-day notice window and 60-day disposal endeavor under Section 12(4) and 12(5).',
          'DIR Consideration: Section 12 proviso mandates judicial consideration of the DIR when submitted.'
        ],
        quizQuestions: [
          {
            id: 'pwdva_12_q1',
            question: 'Under Section 12(5) of PWDVA, what is the statutory disposal endeavor timeline for an application?',
            options: {
              A: '30 days',
              B: '60 days from the date of its first hearing',
              C: '6 months',
              D: '1 year'
            },
            correct: 'B',
            explanation: 'Section 12(5) states that the Magistrate shall endeavor to dispose of every application made under sub-section (1) within a period of sixty days from the date of its first hearing.'
          }
        ],
        telugu: {
          meaning: 'సెక్షన్ 12 కింద బాధిత మహిళ లేదా ప్రొటెక్షన్ ఆఫీసర్ మెజిస్ట్రేట్‌కు రక్షణ, నివాసం, లేదా పరిహారం కోసం దరఖాస్తు చేసుకోవచ్చు.',
          keyPoints: 'దరఖాస్తు అందిన 3 రోజుల్లో మొదటి విచారణ తేదీని నిర్ణయించాలి మరియు 60 రోజుల్లో కేసును పరిష్కరించేందుకు ప్రయత్నించాలి.'
        },
        hindi: {
          meaning: 'धारा 12 के तहत पीड़िता या संरक्षण अधिकारी मजिस्ट्रेट के समक्ष संरक्षण, निवास या मुआवजे की राहत के लिए आवेदन प्रस्तुत कर सकते हैं।',
          keyPoints: 'मजिस्ट्रेट आवेदन मिलने के 3 दिनों के भीतर सुनवाई की तारीख तय करेगा और 60 दिनों में निस्तारण का प्रयास करेगा।'
        }
      },
      '17': {
        sectionNumber: '17',
        heading: 'Right to reside in a shared household',
        status: 'Active & In Force',
        simpleMeaning: 'Section 17 guarantees that every woman in a domestic relationship has the legal right to reside in the shared household. She cannot be evicted or excluded from the shared home by the respondent save in accordance with the procedure established by law.',
        keyPoints: [
          'Affirmative right: The aggrieved woman has a statutory right to live in the shared household regardless of whether she holds any legal title or ownership in the property.',
          'Protection against illegal eviction: The respondent cannot forcibly throw her out, lock her out, or terminate access without a valid court decree.',
          'Broad scope of shared household: As clarified by the Supreme Court in Satish Chander Ahuja (2020), this includes residences where the couple lived together in a domestic relationship, even if owned by in-laws.'
        ],
        hypotheticalExample: '[HYPOTHETICAL EDUCATIONAL SCENARIO — Not a court judgment]\nPooja lives with her husband and in-laws in a house registered in her father-in-law\'s name. Following a marital discord, her in-laws change the front door locks while she is at work and refuse her entry. Under Section 17 of PWDVA, Pooja has an enforceable right to reside in that shared household, and a Magistrate can issue an immediate order restraining her eviction and directing her readmission.',
        examNotes: [
          'Key terminology: "Shared Household" under Section 2(s) read with Section 17.',
          'Landmark Overruling: Satish Chander Ahuja (2020) 10 SCC 786 overruled the restrictive rule in S.R. Batra v. Taruna Batra (2007).',
          'Exam takeaway: Section 17 creates a civil right of occupation, not property ownership or title transfer.'
        ],
        quizQuestions: [
          {
            id: 'pwdva_17_q1',
            question: 'Under Section 17 of PWDVA, when can an aggrieved woman be evicted from the shared household?',
            options: {
              A: 'Whenever the owner of the house demands it in writing',
              B: 'Only in accordance with the procedure established by law',
              C: 'Whenever matrimonial proceedings are initiated',
              D: 'Immediately upon separation'
            },
            correct: 'B',
            explanation: 'Section 17(2) explicitly states that the aggrieved person shall not be evicted or excluded from the shared household or any part of it by the respondent save in accordance with the procedure established by law.'
          },
          {
            id: 'pwdva_17_q2',
            question: 'Does a woman need to have registered ownership in the property to claim residence under Section 17?',
            options: {
              A: 'Yes, she must be a co-owner or tenant',
              B: 'No, having lived in a domestic relationship in the premises is sufficient',
              C: 'Only if the property was purchased after marriage',
              D: 'Only if her parents contributed to the purchase'
            },
            correct: 'B',
            explanation: 'The Supreme Court confirmed that legal ownership by the woman or her husband is not required to establish a "shared household" under Section 17.'
          }
        ],
        telugu: {
          meaning: 'సెక్షన్ 17 ప్రకారం, గృహహింస చట్టం కింద ప్రతి మహిళకు భాగస్వామ్య గృహంలో (shared household) నివసించే చట్టబద్ధమైన హక్కు ఉంది. చట్టబద్ధమైన విధానం లేకుండా ఆమెను ఇంటి నుండి వెళ్ళగొట్టడం లేదా తాళం వేయడం నేరం.',
          keyPoints: '1. ఆస్తిపై యాజమాన్య హక్కు లేకపోయినా నివసించే హక్కు ఉంటుంది.\n2. అత్తమామల పేరిట ఇల్లు ఉన్నప్పటికీ, కలిసి జీవించిన చోట నివసించే రక్షణ లభిస్తుంది (సుప్రీం కోర్టు సతీష్ చందర్ అహుజా తీర్పు).'
        },
        hindi: {
          meaning: 'धारा 17 के तहत, घरेलू हिंसा से पीड़ित किसी भी महिला को साझे घर (Shared Household) में रहने का कानूनी अधिकार प्राप्त है। उसे कानून द्वारा स्थापित प्रक्रिया के बिना घर से बेदखल नहीं किया जा सकता।',
          keyPoints: '1. संपत्ति पर मालिकाना हक न होने पर भी रहने का अधिकार सुरक्षित है।\n2. ससुराल पक्ष के नाम पर मकान होने पर भी यदि वह वहां रही है, तो उसे बेदखल नहीं किया जा सकता (सतीश चंद्र आहूजा बनाम स्नेहा आहूजा निर्णय)।'
        }
      },
      '18': {
        sectionNumber: '18',
        heading: 'Pass of protection orders',
        status: 'Active & In Force',
        simpleMeaning: 'Section 18 empowers a Judicial Magistrate to issue interim or final Protection Orders prohibiting the respondent from committing, attempting, or abetting any acts of domestic violence.',
        keyPoints: [
          'Restraining entry: Prohibits the abuser from entering the aggrieved person’s place of employment, school, or residence.',
          'Restraining communication: Bars the respondent from attempting to communicate with the victim in any form (phone calls, emails, messages, or physical approach).',
          'Asset alienation freeze: Prohibits the respondent from alienating, selling, or encumbering shared property or bank accounts.',
          'Criminal consequences of breach: Breach of a protection order is a cognizable and non-bailable criminal offense under Section 31 (imprisonment up to 1 year and/or fine).'
        ],
        hypotheticalExample: '[HYPOTHETICAL EDUCATIONAL SCENARIO — Not a court judgment]\nRavi continuously turns up at his estranged wife Priya’s corporate workplace, causes a scene in the lobby, and sends threatening text messages. Priya applies to the Judicial Magistrate under Section 18. The Magistrate issues an ex-parte Protection Order directing Ravi to remain at least 500 meters away from her office and barring all electronic communication. If Ravi violates this order, local police must arrest him immediately under Section 31.',
        examNotes: [
          'Ex-parte interim relief: Magistrate can pass orders under Section 23 on the basis of an affidavit without waiting for respondent’s appearance.',
          'Penal sanction: Breach of Section 18 order triggers Section 31 PWDVA (Cognizable & Non-bailable).',
          'Role of Police: Affirmative duty on Station House Officers to assist in enforcing orders.'
        ],
        quizQuestions: [
          {
            id: 'pwdva_18_q1',
            question: 'What is the legal consequence if a respondent breaches a Protection Order issued under Section 18?',
            options: {
              A: 'Only a civil warning is issued',
              B: 'It is a cognizable and non-bailable criminal offense under Section 31',
              C: 'The petitioner must restart the entire case from the beginning',
              D: 'A fine of Rs. 100 with no imprisonment'
            },
            correct: 'B',
            explanation: 'Under Section 31 of PWDVA, a breach of a protection order is punishable with imprisonment up to one year, or with fine up to twenty thousand rupees, or with both, and is cognizable and non-bailable.'
          }
        ],
        telugu: {
          meaning: 'సెక్షన్ 18 ప్రొటెక్షన్ ఆర్డర్స్ (రక్షణ ఉత్తర్వులు) గురించి తెలుపుతుంది. గృహహింసకు పాల్పడకుండా, బాధిత మహిళ ఆఫీస్ లేదా నివాసం వద్దకు రాకుండా, లేదా ఫోన్/సందేశాల ద్వారా బెదిరించకుండా మెజిస్ట్రేట్ నిషేధాజ్ఞలు జారీ చేయవచ్చు.',
          keyPoints: 'రక్షణ ఉత్తర్వులను ఉల్లంఘిస్తే సెక్షన్ 31 కింద బెయిల్ రహిత క్రిమినల్ కేసు నమోదు చేసి అరెస్ట్ చేస్తారు.'
        },
        hindi: {
          meaning: 'धारा 18 के तहत मजिस्ट्रेट पीड़िता की सुरक्षा के लिए संरक्षण आदेश (Protection Orders) जारी कर सकता है, जिससे प्रतिवादी को किसी भी प्रकार की हिंसा करने या पीड़िता के कार्यस्थल/निवास पर जाने से रोका जाता है।',
          keyPoints: 'संरक्षण आदेश का उल्लंघन धारा 31 के तहत एक संज्ञेय और गैर-जमानती अपराध है जिसमें 1 वर्ष तक का कारावास हो सकता है।'
        }
      },
      '19': {
        sectionNumber: '19',
        heading: 'Residence orders',
        status: 'Active & In Force',
        simpleMeaning: 'Section 19 allows the Magistrate to pass Residence Orders to ensure the aggrieved woman continues living safely in the shared household or is provided alternative accommodation by the respondent.',
        keyPoints: [
          'Restraining dispossession: Prevents the respondent from evicting or disturbing the victim’s possession.',
          'Removal of respondent: In appropriate cases, the court can direct the respondent to remove himself from the shared household.',
          'Securing alternate accommodation: Directs the respondent to secure alternative accommodation of the same level as enjoyed by her in the shared household or pay rent.'
        ],
        hypotheticalExample: '[HYPOTHETICAL EDUCATIONAL SCENARIO — Not a court judgment]\nA husband files for divorce and threatens to sell the family flat to throw his wife on the street. The wife files under Section 19. The court issues an injunction restraining any sale, mortgage, or transfer of the flat and orders that the wife shall continue to reside there unhindered.',
        examNotes: [
          'Proviso to Section 19(1)(b): An order directing removal of a respondent cannot be passed against any person who is a woman.',
          'Interaction with Section 17: Section 17 declares the substantive right; Section 19 provides the specific judicial remedies to enforce that right.'
        ],
        quizQuestions: [
          {
            id: 'pwdva_19_q1',
            question: 'Can an order directing a person to remove themselves from the shared household be passed against a woman respondent?',
            options: {
              A: 'Yes, if she is an abuser',
              B: 'No, the proviso to Section 19(1)(b) prohibits directing a woman respondent to remove herself',
              C: 'Only if she is under 30 years old',
              D: 'Only with the permission of the High Court'
            },
            correct: 'B',
            explanation: 'The proviso to Section 19(1)(b) explicitly states: "Provided that no order under clause (b) shall be passed against any person who is a woman."'
          }
        ],
        telugu: {
          meaning: 'సెక్షన్ 19 నివాస ఉత్తర్వులు (Residence Orders) అందిస్తుంది. బాధితురాలిని ఇంట్లో నుండి వెళ్ళగొట్టకుండా, లేదా ఆమెకు సమానమైన ప్రత్యామ్నాయ నివాస వసతిని కల్పించేలా మెజిస్ట్రేట్ ఆదేశించవచ్చు.',
          keyPoints: 'మహిళా ప్రతివాదిని ఇల్లు వదిలి వెళ్లాలని ఆదేశించలేరు (Section 19 Proviso).'
        },
        hindi: {
          meaning: 'धारा 19 निवास आदेश (Residence Orders) से संबंधित है। इसके अंतर्गत न्यायालय महिला को साझे घर में रहने देने या उसके लिए वैकल्पिक आवास की व्यवस्था करने का आदेश दे सकता है।',
          keyPoints: 'धारा 19 के परंतु (Proviso) के अनुसार किसी महिला प्रतिवादी को घर से बाहर निकालने का आदेश नहीं दिया जा सकता।'
        }
      },
      '20': {
        sectionNumber: '20',
        heading: 'Monetary reliefs',
        status: 'Active & In Force',
        simpleMeaning: 'Section 20 empowers the Magistrate to direct the respondent to pay monetary relief to meet expenses incurred and losses suffered by the aggrieved person and any child as a result of domestic violence, including medical expenses, loss of earnings, loss of property, and maintenance.',
        keyPoints: [
          'Comprehensive Financial Support: Covers medical expenses, lost wages, damages for destruction of personal property, and reasonable maintenance.',
          'Independent Relief: In addition to maintenance under Section 125 CrPC / Section 144 BNSS.',
          'Fair & Adequate Standard: Section 20(2) dictates that monetary relief must be adequate, fair, reasonable, and consistent with the standard of living accustomed to by the aggrieved woman.'
        ],
        hypotheticalExample: '[HYPOTHETICAL EDUCATIONAL SCENARIO — Not a court judgment]\nFollowing physical violence, an aggrieved spouse incurs hospital bills and loses freelance income. Under Section 20, the Magistrate directs the respondent to reimburse all medical expenses, compensate for lost earnings, and pay monthly maintenance suited to her standard of living.',
        examNotes: [
          'Section 20(2) statutory principle: Adequate, fair, and consistent with lifestyle.',
          'Enforcement: Failure to pay can trigger distress warrants and salary attachment.'
        ],
        quizQuestions: [
          {
            id: 'pwdva_20_q1',
            question: 'Under Section 20 of PWDVA, what is the standard for determining the quantum of monetary relief?',
            options: {
              A: 'A fixed standard government stipend of Rs. 2,000',
              B: 'Adequate, fair, reasonable, and consistent with the standard of living accustomed to',
              C: 'Flat 5% of respondent salary',
              D: 'Only medical bills with receipts'
            },
            correct: 'B',
            explanation: 'Section 20(2) specifies that the monetary relief granted shall be adequate, fair and reasonable and consistent with the standard of living to which the aggrieved person is accustomed.'
          }
        ],
        telugu: {
          meaning: 'సెక్షన్ 20 కింద వైద్య ఖర్చులు, ఆదాయ నష్టం, ఆస్తి నష్టం మరియు జీవనభృతి కోసం మెజిస్ట్రేట్ ఆర్థిక ఉపశమనం (Monetary Relief) మంజూరు చేయవచ్చు.',
          keyPoints: 'ఇది మహిళ అలవాటుపడిన జీవన ప్రమాణాలకు అనుగుణంగా సరసమైనదిగా ఉండాలి.'
        },
        hindi: {
          meaning: 'धारा 20 के तहत मजिस्ट्रेट घरेलू हिंसा के कारण हुए नुकसान, चिकित्सा व्यय और भरण-पोषण के लिए आर्थिक राहत प्रदान कर सकता है।',
          keyPoints: 'यह राहत महिला के जीवन स्तर के अनुरूप पर्याप्त और उचित होनी चाहिए।'
        }
      },
      '21': {
        sectionNumber: '21',
        heading: 'Custody orders',
        status: 'Active & In Force',
        simpleMeaning: 'Section 21 allows the Magistrate to grant temporary custody of any child or children to the aggrieved person or the person making an application on her behalf at any stage of hearing, and to regulate or completely disallow visits by the respondent if harmful.',
        keyPoints: [
          'Child Welfare Paramount: Focuses on safeguarding the physical and emotional welfare of the child.',
          'Interim Protection: Temporary custody can be granted immediately during proceedings.',
          'Refusal of Visitation: If visits by the respondent would be harmful to the child, the Magistrate can refuse visitations entirely.'
        ],
        hypotheticalExample: '[HYPOTHETICAL EDUCATIONAL SCENARIO — Not a court judgment]\nA respondent threatens to forcibly abduct the couple’s child to force withdrawal of legal proceedings. Under Section 21, the Magistrate grants temporary custody to the mother and restrains the father from approaching the child’s school.',
        examNotes: [
          'Section 21 Proviso: The Magistrate shall refuse visitations if they would be harmful to the child.',
          'Operates alongside Family Court guardianship proceedings.'
        ],
        quizQuestions: [
          {
            id: 'pwdva_21_q1',
            question: 'Can a Magistrate disallow child visitation rights to a respondent under Section 21 of PWDVA?',
            options: {
              A: 'No, fathers have absolute rights',
              B: 'Yes, if visitation would be harmful to the child',
              C: 'Only if the child is over 18 years old',
              D: 'Only with Supreme Court permission'
            },
            correct: 'B',
            explanation: 'The proviso to Section 21 explicitly gives the Magistrate power to refuse visitation if it would be harmful to the child.'
          }
        ],
        telugu: {
          meaning: 'సెక్షన్ 21 పిల్లల తాత్కాలిక కస్టడీని తల్లికి ఇచ్చే అధికారాన్ని మెజిస్ట్రేట్‌కు కల్పిస్తుంది.',
          keyPoints: 'పిల్లల సంక్షేమానికి హానికరమని భావిస్తే తండ్రి సందర్శన హక్కులను పూర్తిగా నిలిపివేయవచ్చు.'
        },
        hindi: {
          meaning: 'धारा 21 मजिस्ट्रेट को बच्चों की अस्थायी कस्टडी पीड़िता को सौंपने और बच्चे की सुरक्षा के लिए प्रतिवादी के मिलने पर रोक लगाने का अधिकार देती है।',
          keyPoints: 'यदि बच्चे के हित के विपरीत हो, तो मिलने की अनुमति से इनकार किया जा सकता है।'
        }
      },
      '22': {
        sectionNumber: '22',
        heading: 'Compensation orders',
        status: 'Active & In Force',
        simpleMeaning: 'Section 22 empowers the Magistrate to pass an order directing the respondent to pay compensation and damages for injuries, including mental torture and emotional distress, caused by acts of domestic violence committed by that respondent.',
        keyPoints: [
          'Tort and Emotional Harm: Specifically compensates for mental torture, distress, and trauma.',
          'Additional Remedy: Granted in addition to other reliefs such as protection and maintenance.'
        ],
        hypotheticalExample: '[HYPOTHETICAL EDUCATIONAL SCENARIO — Not a court judgment]\nAn aggrieved woman who suffered severe psychological distress and trauma from continuous harassment is awarded Rs. 5,00,000 as compensation for mental torture under Section 22.',
        examNotes: [
          'Section 22 integrates civil damages for emotional torture into summary statutory relief.'
        ],
        quizQuestions: [
          {
            id: 'pwdva_22_q1',
            question: 'What specific category of injury does Section 22 of PWDVA empower the Magistrate to compensate?',
            options: {
              A: 'Commercial loss only',
              B: 'Mental torture and emotional distress caused by domestic violence',
              C: 'Property tax arrears',
              D: 'None of the above'
            },
            correct: 'B',
            explanation: 'Section 22 explicitly empowers the Magistrate to award compensation for mental torture and emotional distress.'
          }
        ],
        telugu: {
          meaning: 'సెక్షన్ 22 గృహహింస వల్ల కలిగిన మానసిక క్షోభ, వేదన మరియు గాయాలకు నష్టపరిహారం (Compensation) చెల్లించాలని ఆదేశిస్తుంది.',
          keyPoints: 'ఇది ఇతర ఉపశమనాలతో పాటు అదనంగా ఇవ్వబడే పరిహారం.'
        },
        hindi: {
          meaning: 'धारा 22 मानसिक यातना और भावनात्मक संकट के लिए प्रतिवादी द्वारा मुआवजा और क्षतिपूर्ति देने का आदेश देती है।',
          keyPoints: 'यह भरण-पोषण के अतिरिक्त मानसिक प्रताड़ना के लिए दी जाने वाली क्षतिपूर्ति है।'
        }
      },
      '23': {
        sectionNumber: '23',
        heading: 'Power to grant interim and ex parte orders',
        status: 'Active & In Force',
        simpleMeaning: 'Section 23 empowers the Magistrate to pass interim orders in any proceeding under PWDVA. Under Section 23(2), if the Magistrate is satisfied an application prima facie discloses an act of domestic violence or danger of its commission, the Magistrate may grant an ex parte order on the basis of an affidavit from the aggrieved person without waiting for the respondent to appear.',
        keyPoints: [
          'Ex-Parte Jurisdiction: Section 23(2) allows the court to issue immediate restraining orders without prior notice to the respondent when urgent protection is required.',
          'Affidavit-Driven: Relief is granted upon an affidavit in the prescribed format (Form III).',
          'Wide Scope: Interim orders can cover protection orders (Sec 18), residence orders (Sec 19), monetary relief (Sec 20), or custody (Sec 21).',
          'Supreme Court Authority: Kunapareddy v. Kunapareddy (2016) 11 SCC 774 confirmed that Magistrates have wide powers under Section 23 to fashion interim orders ensuring substantial justice.'
        ],
        hypotheticalExample: '[HYPOTHETICAL EDUCATIONAL SCENARIO — Not a court judgment]\nA woman arrives at court with evidence that her husband intends to throw her belongings out and change the house locks tonight. Under Section 23(2), the Magistrate issues an immediate ex-parte injunction freezing the property and restraining her dispossession on the basis of her sworn affidavit before issuing formal summons to the husband.',
        examNotes: [
          'Key provision: Section 23(2) ex-parte power on affidavit.',
          'Prescribed form: Affidavit under Form III of PWDVA Rules.',
          'Landmark authority: Kunapareddy v. Kunapareddy (2016) 11 SCC 774.'
        ],
        quizQuestions: [
          {
            id: 'pwdva_23_q1',
            question: 'Under Section 23(2) of PWDVA, on what basis may a Magistrate grant an ex parte interim order?',
            options: {
              A: 'Only after 3 formal hearings with the respondent',
              B: 'On the basis of an affidavit from the aggrieved person disclosing prima facie domestic violence',
              C: 'Only upon approval from the High Court',
              D: 'Only after forensic police inquiry'
            },
            correct: 'B',
            explanation: 'Section 23(2) allows the Magistrate to pass ex parte orders on the basis of the affidavit in such form as may be prescribed of the aggrieved person.'
          },
          {
            id: 'pwdva_23_q2',
            question: 'Which landmark Supreme Court decision affirmed the Magistrate’s power under Section 23 PWDVA to pass wide interim protective orders?',
            options: {
              A: 'Kunapareddy v. Kunapareddy (2016)',
              B: 'Kesavananda Bharati v. State of Kerala',
              C: 'Maneka Gandhi v. Union of India',
              D: 'Vishaka v. State of Rajasthan'
            },
            correct: 'A',
            explanation: 'In Kunapareddy v. Kunapareddy (2016) 11 SCC 774, the Supreme Court confirmed the inherent and statutory powers under Section 23 to issue effective interim relief.'
          }
        ],
        telugu: {
          meaning: 'సెక్షన్ 23 ప్రకారం అత్యవసర పరిస్థితుల్లో మెజిస్ట్రేట్ బాధితురాలి అఫిడవిట్ ఆధారంగా ప్రతివాది రాకముందే తాత్కాలిక ఎక్స్-పార్టీ ఉత్తర్వులు (Ex-parte orders) జారీ చేయవచ్చు.',
          keyPoints: '1. సెక్షన్ 23(2) కింద అఫిడవిట్‌పై తక్షణ రక్షణ ఉత్తర్వులు ఇవ్వవచ్చు.\n2. సుప్రీం కోర్టు కునపరెడ్డి (2016) తీర్పు ఈ అధికారాలను సమర్థించింది.'
        },
        hindi: {
          meaning: 'धारा 23 मजिस्ट्रेट को अंतरिम और एकतरफा (ex-parte) आदेश पारित करने का अधिकार देती है। पीड़िता के शपथ पत्र (affidavit) के आधार पर तत्काल सुरक्षा आदेश दिए जा सकते हैं।',
          keyPoints: '1. धारा 23(2) के तहत प्रतिवादी को सुने बिना भी तात्कालिक अंतरिम राहत दी जा सकती है।\n2. कुनापरेड्डी बनाम कुनापरेड्डी (2016) सुप्रीम कोर्ट निर्णय ने इस अधिकार की पुष्टि की।'
        }
      },
      '31': {
        sectionNumber: '31',
        heading: 'Penalty for breach of protection order by respondent',
        status: 'Active & In Force',
        simpleMeaning: 'Section 31 provides the penal teeth to PWDVA. A breach of any protection order or interim protection order by the respondent is a cognizable and non-bailable criminal offense, punishable with imprisonment of either description for a term which may extend to one year, or with fine up to twenty thousand rupees, or with both.',
        keyPoints: [
          'Criminalization of Breach: Transforms civil protection into criminal enforcement; willful violation of an order is punishable as a crime.',
          'Cognizable & Non-Bailable: Under Section 32, the offense under Section 31 is cognizable and non-bailable; police can arrest without warrant.',
          'Magistrate’s Jurisdiction: The Magistrate who passed the protection order can frame charges and try the respondent under Section 31(2).',
          'Presumption: Sole testimony of the aggrieved person may lead the court to conclude an offense was committed under Section 32(2).'
        ],
        hypotheticalExample: '[HYPOTHETICAL EDUCATIONAL SCENARIO — Not a court judgment]\nA Magistrate issued a Section 18 protection order directing Ramesh to stay at least 500 meters away from his estranged wife’s workplace and refrain from telephoning her. Ramesh violates the order by entering her office lobby and shouting threats. The wife contacts the police. Under Section 31 of PWDVA, police must arrest Ramesh without a warrant because the breach is a cognizable and non-bailable offense.',
        examNotes: [
          'Penal sanction: Up to 1 year imprisonment and/or Rs 20,000 fine under Section 31(1).',
          'Cognizable and Non-Bailable: Section 32(1) explicitly classifies offenses under Section 31 as cognizable and non-bailable.',
          'Framing of charge: Section 31(2) allows the Magistrate who passed the order to frame charges under Section 31 and IPC/BNS simultaneously.'
        ],
        quizQuestions: [
          {
            id: 'pwdva_31_q1',
            question: 'Under Section 31 of PWDVA, what is the maximum punishment for breach of a protection order by the respondent?',
            options: {
              A: 'Imprisonment up to 1 year, or fine up to Rs. 20,000, or both',
              B: 'A simple civil warning only',
              C: 'Imprisonment up to 10 years',
              D: 'Community service for 1 week'
            },
            correct: 'A',
            explanation: 'Under Section 31(1), breach of a protection order is punishable with imprisonment up to one year, or with fine up to twenty thousand rupees, or with both.'
          },
          {
            id: 'pwdva_31_q2',
            question: 'Under Section 32 of PWDVA, how is an offense under Section 31 classified?',
            options: {
              A: 'Non-cognizable and bailable',
              B: 'Cognizable and non-bailable',
              C: 'Compoundable without court permission',
              D: 'Civil contempt only'
            },
            correct: 'B',
            explanation: 'Section 32(1) explicitly provides that the offense under Section 31 shall be cognizable and non-bailable.'
          }
        ],
        telugu: {
          meaning: 'సెక్షన్ 31 ప్రకారం మెజిస్ట్రేట్ ఇచ్చిన రక్షణ ఉత్తర్వులను ఉల్లంఘిస్తే అది నాన్-బెయిలబుల్ క్రిమినల్ నేరం. 1 సంవత్సరం వరకు జైలు శిక్ష లేదా రూ. 20,000 జరిమానా లేదా రెండూ విధించవచ్చు.',
          keyPoints: '1. రక్షణ ఉత్తర్వుల ఉల్లంఘన కాగ్నిజబుల్ మరియు నాన్-బెయిలబుల్ నేరం.\n2. పోలీసు అధికారులు వారెంట్ లేకుండా అరెస్ట్ చేయవచ్చు (Section 32).'
        },
        hindi: {
          meaning: 'धारा 31 के अनुसार संरक्षण आदेश का उल्लंघन करना एक संज्ञेय और गैर-जमानती अपराध है, जिसमें 1 वर्ष तक का कारावास या 20,000 रुपये तक का जुर्माना या दोनों हो सकते हैं।',
          keyPoints: '1. संरक्षण आदेश का उल्लंघन एक गंभीर गैर-जमानती अपराध है।\n2. पुलिस बिना वारंट के गिरफ्तार कर सकती है (धारा 32)।'
        }
      }
    }
  },
  'pocso': {
    actName: 'Protection of Children from Sexual Offences Act, 2012',
    actIdentifier: 'POCSO',
    maxSection: 46,
    jurisdiction: 'India (Central Legislation)',
    indiaCodeUrl: 'https://www.indiacode.nic.in/handle/123456789/2079',
    sections: {
      '3': {
        sectionNumber: '3',
        heading: 'Penetrative sexual assault',
        status: 'Active & In Force',
        simpleMeaning: 'Section 3 defines penetrative sexual assault against any child (defined as any person below 18 years of age under Section 2(1)(d)). It criminalizes penetration into the vagina, mouth, urethra, or anus of a child by any person with their penis or any other body part or object.',
        keyPoints: [
          'Gender-Neutral Protection: Protects all children under 18 years of age regardless of sex.',
          'Strict Statutory Standard: Consent of a child is legally immaterial under the Act.',
          'Landmark Overruling: Attorney General for India v. Satish (2022) 5 SCC 545 overturned the restrictive "skin-to-skin" interpretation, affirming that sexual intent and touching sexual parts constitutes sexual assault.'
        ],
        hypotheticalExample: '[HYPOTHETICAL EDUCATIONAL SCENARIO — Not a court judgment]\nA perpetrator commits sexual assault on a 14-year-old child. Under Section 3, the offense is penetrative sexual assault, and statutory presumptions of culpable mental state apply under Sections 29 & 30 of POCSO.',
        examNotes: [
          'Definition of Child: Under Section 2(1)(d), any person below eighteen years of age.',
          'Overruling: Attorney General for India v. Satish (2022) 5 SCC 545.'
        ],
        quizQuestions: [
          {
            id: 'pocso_3_q1',
            question: 'Under Section 2(1)(d) of the POCSO Act, 2012, who is defined as a child?',
            options: {
              A: 'Any person below 14 years of age',
              B: 'Any person below 16 years of age',
              C: 'Any person below 18 years of age',
              D: 'Any person below 21 years of age'
            },
            correct: 'C',
            explanation: 'Under Section 2(1)(d) of POCSO, "child" means any person below the age of eighteen years.'
          }
        ],
        telugu: {
          meaning: 'POCSO సెక్షన్ 3 పిల్లలపై (18 ఏళ్ల లోపు) జరిగే చొచ్చుకుపోయే లైంగిక దాడిని (Penetrative Sexual Assault) నిర్వచిస్తుంది.',
          keyPoints: '18 సంవత్సరాల లోపు ఉన్న ప్రతి ఒక్కరూ బాలురు లేదా బాలికలు ఈ చట్టం ద్వారా సంపూర్ణ రక్షణ పొందుతారు.'
        },
        hindi: {
          meaning: 'पॉक्सो धारा 3 बच्चों (18 वर्ष से कम) पर प्रवेशन लैंगिक हमले (Penetrative Sexual Assault) को परिभाषित करती है।',
          keyPoints: '18 वर्ष से कम आयु के सभी बच्चे लैंगिक अपराधों के विरुद्ध इस धारा के तहत संरक्षित हैं।'
        }
      },
      '4': {
        sectionNumber: '4',
        heading: 'Punishment for penetrative sexual assault',
        status: 'Active & In Force',
        simpleMeaning: 'Section 4 prescribes rigorous punishment for committing penetrative sexual assault, mandating imprisonment of not less than 10 years, which may extend to imprisonment for life, and a fine.',
        keyPoints: [
          'Mandatory Minimum: Strict minimum sentence of 10 years rigorous imprisonment.',
          'Enhanced Penalties: Stricter punishments apply for aggravated forms or younger children.'
        ],
        hypotheticalExample: '[HYPOTHETICAL EDUCATIONAL SCENARIO — Not a court judgment]\nAn accused convicted under Section 4 faces a mandatory minimum sentence of 10 years imprisonment alongside liability for fine payable to the victim.',
        examNotes: [
          'Minimum sentence: 10 years rigorous imprisonment up to life imprisonment.'
        ],
        quizQuestions: [
          {
            id: 'pocso_4_q1',
            question: 'What is the mandatory minimum term of imprisonment under Section 4 of POCSO for penetrative sexual assault?',
            options: {
              A: '3 years',
              B: '5 years',
              C: '10 years',
              D: 'Life imprisonment only'
            },
            correct: 'C',
            explanation: 'Section 4 mandates rigorous imprisonment for a term which shall not be less than ten years.'
          }
        ],
        telugu: {
          meaning: 'POCSO సెక్షన్ 4 చొచ్చుకుపోయే లైంగిక దాడికి కనీసం 10 సంవత్సరాల కఠిన కారాగార శిక్ష లేదా జీవిత ఖైదు విధిస్తుంది.',
          keyPoints: 'ఈ నేరానికి కనీస శిక్ష 10 సంవత్సరాలు.'
        },
        hindi: {
          meaning: 'पॉक्सो धारा 4 प्रवेशन लैंगिक हमले के लिए न्यूनतम 10 वर्ष के कठोर कारावास अथवा आजीवन कारावास का प्रावधान करती है।',
          keyPoints: 'इस अपराध के लिए न्यूनतम 10 वर्ष की अनिवार्य सजा है।'
        }
      },
      '19': {
        sectionNumber: '19',
        heading: 'Recording of information (Mandatory reporting)',
        status: 'Active & In Force',
        simpleMeaning: 'Section 19 imposes a legal mandate on any person who has apprehension or knowledge that an offense under POCSO has been committed to report it immediately to the Special Juvenile Police Unit or local police.',
        keyPoints: [
          'Mandatory Reporting: Obligates doctors, teachers, family, and public members to report child sexual abuse.',
          'Protection of Informant: Informant acting in good faith is immune from civil or criminal liability.',
          'Penal Sanction: Failure to report is punishable under Section 21.'
        ],
        hypotheticalExample: '[HYPOTHETICAL EDUCATIONAL SCENARIO — Not a court judgment]\nA school principal is informed by a counselor of an ongoing offense against a minor student. The principal must immediately report the matter to local police under Section 19.',
        examNotes: [
          'Mandatory reporting provision; immunity under Section 19(7); failure penalised under Section 21.'
        ],
        quizQuestions: [
          {
            id: 'pocso_19_q1',
            question: 'Under Section 19 of POCSO, who has the legal duty to report suspected child sexual abuse?',
            options: {
              A: 'Only the biological parents',
              B: 'Any person who has apprehension or knowledge that an offense has been committed',
              C: 'Only registered medical doctors',
              D: 'Only gazetted police officers'
            },
            correct: 'B',
            explanation: 'Section 19(1) explicitly mandates that any person who has an apprehension or knowledge that an offense has been committed must report it.'
          }
        ],
        telugu: {
          meaning: 'POCSO సెక్షన్ 19 ప్రకారం పిల్లలపై లైంగిక దాడి గురించి తెలిసిన ఎవరైనా తప్పనిసరిగా పోలీసులకు సమాచారం ఇవ్వాలి.',
          keyPoints: 'సమాచారం ఇవ్వకపోవడం సెక్షన్ 21 కింద శిక్షార్హమైన నేరం.'
        },
        hindi: {
          meaning: 'पॉक्सो धारा 19 के अनुसार बाल यौन शोषण की जानकारी होने पर किसी भी व्यक्ति को तत्काल पुलिस को सूचित करना अनिवार्य है।',
          keyPoints: 'सूचना न देना धारा 21 के तहत दंडनीय अपराध है।'
        }
      },
      '21': {
        sectionNumber: '21',
        heading: 'Punishment for failure to report or record a case',
        status: 'Active & In Force',
        simpleMeaning: 'Section 21 penalizes any person who fails to report an offense under Section 19 or Section 20 with imprisonment up to six months or with fine or with both (or up to one year for person in charge of an institution).',
        keyPoints: [
          'Institutional Responsibility: Stricter penalty (up to 1 year) for persons in charge of schools, hospitals, or care institutions.',
          'Zero Discretion: Obligation to report is mandatory.'
        ],
        hypotheticalExample: '[HYPOTHETICAL EDUCATIONAL SCENARIO — Not a court judgment]\nAn institution manager conceals an incident of child abuse to protect the organization reputation. The manager is prosecuted under Section 21 with up to 1 year imprisonment.',
        examNotes: [
          'Penalizes failure to report under Section 19; up to 1 year imprisonment for institution heads.'
        ],
        quizQuestions: [
          {
            id: 'pocso_21_q1',
            question: 'What is the punishment under Section 21 for a person in charge of an institution failing to report an offense under POCSO?',
            options: {
              A: 'Warning letter only',
              B: 'Imprisonment up to one year, or fine, or both',
              C: 'Imprisonment up to 10 years',
              D: 'Cancellation of Aadhaar card'
            },
            correct: 'B',
            explanation: 'Under Section 21(2), a person in charge of an institution failing to report is punishable with imprisonment up to one year or with fine or with both.'
          }
        ],
        telugu: {
          meaning: 'POCSO సెక్షన్ 21 సమాచారం ఇవ్వడంలో విఫలమైన వారికి 6 నెలల నుండి 1 సంవత్సరం వరకు జైలు శిక్ష విధించబడుతుందని తెలుపుతుంది.',
          keyPoints: 'సంస్థల నిర్వాహకులకు 1 సంవత్సరం వరకు జైలు శిక్ష విధించవచ్చు.'
        },
        hindi: {
          meaning: 'पॉक्सो धारा 21 सूचना न देने पर 6 माह से 1 वर्ष तक के कारावास अथवा जुर्माने का प्रावधान करती है।',
          keyPoints: 'संस्था प्रमुखों के लिए 1 वर्ष तक की सजा हो सकती है।'
        }
      },
      '23': {
        sectionNumber: '23',
        heading: 'Procedure for media and protection of identity of child',
        status: 'Active & In Force',
        simpleMeaning: 'Section 23 of POCSO strictly prohibits any person or media organization from disclosing the identity of a child victim or witness (including name, address, photograph, family details, school, or any information leading to identification) in any print, electronic, or social media. Breach is punishable with imprisonment not less than six months up to one year, or fine, or both.',
        keyPoints: [
          'Absolute Protection of Child Identity: Forbids publishing names, photographs, school details, or addresses.',
          'Supreme Court Binding Guidelines: Nipun Saxena v. Union of India (2019) 2 SCC 703 issued nationwide directions enforcing complete privacy of victims under POCSO Section 23 and IPC Section 228A.',
          'Criminal Penalty: Minimum imprisonment of 6 months up to 1 year for violating media disclosure restrictions.'
        ],
        hypotheticalExample: '[HYPOTHETICAL EDUCATIONAL SCENARIO — Not a court judgment]\nA news channel broadcasts footage revealing the school uniform and residential colony of a minor sexual abuse survivor. Under Section 23 of POCSO, the editor and reporter face criminal prosecution punishable with mandatory imprisonment of 6 months to 1 year.',
        examNotes: [
          'Landmark Authority: Nipun Saxena v. Union of India (2019) 2 SCC 703.',
          'Penal sanction: Imprisonment from 6 months to 1 year, or fine, or both under Section 23(4).'
        ],
        quizQuestions: [
          {
            id: 'pocso_23_q1',
            question: 'Under Section 23 of POCSO, what is the penalty for publishing the name or identity of a child victim in media?',
            options: {
              A: 'Apology notice only',
              B: 'Imprisonment not less than six months and up to one year, or fine, or both',
              C: 'Fine of Rs. 100 only',
              D: 'No penalty if reported by accredited journalists'
            },
            correct: 'B',
            explanation: 'Section 23(4) provides that any person who contravenes the provisions of sub-section (1) or (2) shall be punished with imprisonment not less than six months up to one year or with fine or with both.'
          }
        ],
        telugu: {
          meaning: 'POCSO సెక్షన్ 23 మీడియాలో బాధితురాలైన పిల్లల పేరు, చిరునామా, ఫోటోలు ప్రచురించడాన్ని కఠినంగా నిషేధిస్తుంది. ఉల్లంఘిస్తే 6 నెలల నుండి 1 సంవత్సరం వరకు జైలు శిక్ష విధించబడుతుంది.',
          keyPoints: 'సుప్రీం కోర్టు నిపుణ్ సక్సేనా (2019) తీర్పు ప్రకారం బాధితుల గుర్తింపును పూర్తిగా గోప్యంగా ఉంచాలి.'
        },
        hindi: {
          meaning: 'पॉक्सो धारा 23 मीडिया में पीड़ित बच्चे की पहचान, नाम, फोटो या पते को उजागर करने पर पूर्ण प्रतिबंध लगाती है। उल्लंघन पर 6 माह से 1 वर्ष तक का कारावास हो सकता है।',
          keyPoints: 'सुप्रीम कोर्ट के निपुण सक्सेना (2019) निर्णय ने इस गोपनीयता को अनिवार्य बनाया है।'
        }
      },
      '31': {
        sectionNumber: '31',
        heading: 'Application of Code of Criminal Procedure, 1973 to proceedings before a Special Court',
        status: 'Active & In Force',
        simpleMeaning: 'Section 31 provides that the provisions of the Code of Criminal Procedure (now BNSS) apply to proceedings before a Special Court under POCSO, and the Special Court is deemed to be a Court of Session for all procedural purposes.',
        keyPoints: [
          'Session Court Powers: Special Court exercises all powers of a Court of Session.',
          'Procedural Harmony: Integrates CrPC/BNSS rules for evidence, bail, and trial procedures.'
        ],
        hypotheticalExample: '[HYPOTHETICAL EDUCATIONAL SCENARIO — Not a court judgment]\nA trial begins before a Special Court under POCSO. Under Section 31, the court exercises full Sessions Court procedural powers under the criminal procedure code.',
        examNotes: [
          'Deemed Court of Session under Section 31; CrPC/BNSS applies except where explicitly modified by POCSO.'
        ],
        quizQuestions: [
          {
            id: 'pocso_31_q1',
            question: 'Under Section 31 of POCSO, what status is conferred upon the Special Court?',
            options: {
              A: 'Panchayat Court',
              B: 'Deemed to be a Court of Session',
              C: 'Executive Magistrate Court',
              D: 'Civil Court only'
            },
            correct: 'B',
            explanation: 'Section 31 states that the Special Court shall be deemed to be a Court of Session.'
          }
        ],
        telugu: {
          meaning: 'POCSO సెక్షన్ 31 ప్రత్యేక కోర్టుకు సెషన్స్ కోర్టు అధికారాలు ఉంటాయని మరియు క్రిమినల్ ప్రొసీజర్ కోడ్ వర్తిస్తుందని తెలుపుతుంది.',
          keyPoints: 'ప్రత్యేక కోర్టు సెషన్స్ కోర్టుగా పరిగణించబడుతుంది.'
        },
        hindi: {
          meaning: 'पॉक्सो धारा 31 के अनुसार विशेष अदालत को सत्र न्यायालय (Court of Session) का दर्जा प्राप्त है और आपराधिक प्रक्रिया संहिता लागू होती है।',
          keyPoints: 'विशेष अदालत सत्र न्यायालय के सभी अधिकारों का प्रयोग करती है।'
        }
      }
    }
  },
  'bns': {
    actName: 'Bharatiya Nyaya Sanhita, 2023',
    actIdentifier: 'BNS',
    maxSection: 358,
    jurisdiction: 'India (Central Legislation)',
    indiaCodeUrl: 'https://www.indiacode.nic.in/handle/123456789/2023',
    sections: {
      '3': {
        sectionNumber: '3',
        heading: 'General principles of criminal liability and punishments',
        status: 'Active & In Force (Effective 1 July 2024)',
        simpleMeaning: 'BNS Section 3 provides the foundational framework of criminal offenses, territorial jurisdiction, and the six classes of punishments: death, imprisonment for life, rigorous and simple imprisonment, forfeiture of property, fine, and community service.',
        keyPoints: [
          'Six Classes of Punishments: Retains traditional punishments and formally adds Community Service as an innovative reformatory penalty.',
          'Territorial Jurisdiction: Covers offenses committed within India and by Indian citizens abroad.',
          'Foundational Principle: Replaces and modernizes Chapters II & III of the Indian Penal Code, 1860.'
        ],
        hypotheticalExample: '[HYPOTHETICAL EDUCATIONAL SCENARIO — Not a court judgment]\nA first-time offender commits a minor public nuisance. Under BNS Section 3, the court can award community service instead of prison, fulfilling the modern reformatory intent of the new penal code.',
        examNotes: [
          'Modern Innovation: Addition of Community Service under Section 3(f).',
          'Replaced provisions: IPC Sections 53-75.'
        ],
        quizQuestions: [
          {
            id: 'bns_3_q1',
            question: 'Which new form of punishment was formally introduced under Section 4 / Section 3 framework of BNS 2023?',
            options: {
              A: 'Banishment from country',
              B: 'Community Service',
              C: 'Solitary confinement for 10 years',
              D: 'Public humiliation'
            },
            correct: 'B',
            explanation: 'BNS formally introduced Community Service as a statutory penal measure for minor offenses.'
          }
        ],
        telugu: {
          meaning: 'BNS సెక్షన్ 3 క్రిమినల్ బాధ్యత మరియు శిక్షల రకాలను (కమ్యూనిటీ సర్వీస్ తో సహా) నిర్వచిస్తుంది.',
          keyPoints: 'భారతీయ న్యాయ సంహితలో కమ్యూనిటీ సర్వీస్ కొత్త శిక్షారూపంగా చేర్చబడింది.'
        },
        hindi: {
          meaning: 'बीएनएस धारा 3 आपराधिक दायित्व और दंड के प्रकारों (सामुदायिक सेवा सहित) को परिभाषित करती है।',
          keyPoints: 'नए कानून में सामुदायिक सेवा (Community Service) को एक नई सजा के रूप में शामिल किया गया है।'
        }
      },
      '23': {
        sectionNumber: '23',
        heading: 'Act of child above seven and under twelve of immature understanding',
        status: 'Active & In Force (Effective 1 July 2024)',
        simpleMeaning: 'BNS Section 23 (replacing IPC Section 83) establishes the doctrine of doli incapax. Nothing is an offense which is done by a child above seven years of age and under twelve, who has not attained sufficient maturity of understanding to judge the nature and consequence of their conduct.',
        keyPoints: [
          'Immature Understanding: The test is whether the child possessed sufficient cognitive maturity to understand the nature and consequences of the act.',
          'Age Bracket: Applies between 7 and 12 years of age (children under 7 have absolute immunity under Section 22).'
        ],
        hypotheticalExample: '[HYPOTHETICAL EDUCATIONAL SCENARIO — Not a court judgment]\nAn 8-year-old child picks up a dropped wallet believing it to be a toy. Under BNS Section 23, if the child lacks maturity of understanding, no criminal intent (mens rea) exists and the act is not an offense.',
        examNotes: [
          'Doctrine of Doli Incapax; replaces IPC Section 83.',
          'Subjective assessment of understanding.'
        ],
        quizQuestions: [
          {
            id: 'bns_23_q1',
            question: 'Under BNS Section 23, what is the age group covered for defense of immature understanding?',
            options: {
              A: 'Above 7 and under 12 years of age',
              B: 'Above 12 and under 16 years of age',
              C: 'Under 18 years of age',
              D: 'Only under 5 years of age'
            },
            correct: 'A',
            explanation: 'BNS Section 23 covers children above seven years of age and under twelve who have not attained sufficient maturity of understanding.'
          }
        ],
        telugu: {
          meaning: 'BNS సెక్షన్ 23 ప్రకారం 7 నుండి 12 సంవత్సరాల లోపు వయస్సు ఉన్న పిల్లలు సరైన పరిపక్వత లేక చేసిన చర్యలు నేరం కాదు.',
          keyPoints: 'పిల్లల మానసిక పరిపక్వత ఆధారంగా నేర బాధ్యత నిర్ణయించబడుతుంది.'
        },
        hindi: {
          meaning: 'बीएनएस धारा 23 के अनुसार 7 से 12 वर्ष के अविकसित समझ वाले बालक द्वारा किया गया कोई कार्य अपराध नहीं है।',
          keyPoints: 'यदि बालक कार्य की प्रकृति और परिणाम समझने में असमर्थ है, तो वह आपराधिक दायित्व से मुक्त है।'
        }
      },
      '31': {
        sectionNumber: '31',
        heading: 'Consent known to be given under fear or misconception',
        status: 'Active & In Force (Effective 1 July 2024)',
        simpleMeaning: 'BNS Section 31 (replacing IPC Section 90) invalidates consent given under fear of injury or misconception of fact. If the person obtaining consent knows or has reason to believe that consent was given under fear or misconception, it does not constitute valid consent in the eyes of law.',
        keyPoints: [
          'Vitiated Consent: Consent obtained through threat, coercion, or deceitful misconception is legally void.',
          'Application to Sexual and Property Offenses: Critical in evaluating allegations where consent was obtained under false promise of marriage or coercion.'
        ],
        hypotheticalExample: '[HYPOTHETICAL EDUCATIONAL SCENARIO — Not a court judgment]\nA person yields access to assets or bodily integrity under an immediate threat of violence to their family. Under BNS Section 31, this submission is not valid consent because it was given under fear of injury.',
        examNotes: [
          'Replaced provision: IPC Section 90.',
          'Vital for determining mens rea and defense of consent in criminal jurisprudence.'
        ],
        quizQuestions: [
          {
            id: 'bns_31_q1',
            question: 'Under BNS Section 31, when is consent NOT considered valid consent?',
            options: {
              A: 'When given verbally only',
              B: 'When given under fear of injury or under misconception of fact known to the perpetrator',
              C: 'When given in the presence of witnesses',
              D: 'When given without a lawyer present'
            },
            correct: 'B',
            explanation: 'BNS Section 31 provides that consent given under fear of injury or under misconception of fact is not valid consent if the person obtaining it had reason to know.'
          }
        ],
        telugu: {
          meaning: 'BNS సెక్షన్ 31 భయం లేదా అపోహల ద్వారా పొందిన సమ్మతిని చట్టబద్ధమైన సమ్మతిగా పరిగణించలేమని తెలుపుతుంది.',
          keyPoints: 'బెదిరింపులు లేదా మోసపూరిత హామీల ద్వారా పొందిన సమ్మతి చెల్లదు.'
        },
        hindi: {
          meaning: 'बीएनएस धारा 31 के अनुसार भय या तथ्य की गलतफहमी के अधीन दी गई सहमति विधिमान्य नहीं होती है।',
          keyPoints: 'धमकी या धोखे से प्राप्त सहमति कानून की नजर में अमान्य है।'
        }
      },
      '74': {
        sectionNumber: '74',
        heading: 'Assault or criminal force to woman with intent to outrage her modesty',
        status: 'Active & In Force (Effective 1 July 2024)',
        simpleMeaning: 'BNS Section 74 (replacing IPC Section 354) penalizes assaulting or using criminal force against any woman intending to outrage, or knowing it to be likely that it will outrage her modesty, with imprisonment between one and five years, and fine.',
        keyPoints: [
          'Essential Ingredients: Assault or criminal force directed specifically against a woman with intent or knowledge to outrage modesty.',
          'Penal Sanction: Minimum imprisonment of 1 year, extending up to 5 years, plus fine.'
        ],
        hypotheticalExample: '[HYPOTHETICAL EDUCATIONAL SCENARIO — Not a court judgment]\nA man forcibly grabs a woman’s wrist and attempts to pull her veil in a public market. Under BNS Section 74, this constitutes criminal force with intent to outrage modesty, punishable with up to 5 years imprisonment.',
        examNotes: [
          'Replaces IPC Section 354.',
          'Cognizable and Non-Bailable offense.'
        ],
        quizQuestions: [
          {
            id: 'bns_74_q1',
            question: 'What is the punishment under BNS Section 74 for outraging the modesty of a woman?',
            options: {
              A: 'Imprisonment not less than 1 year which may extend to 5 years, and fine',
              B: 'Fine of Rs. 500 only',
              C: 'Simple warning',
              D: 'Imprisonment for life'
            },
            correct: 'A',
            explanation: 'BNS Section 74 prescribes imprisonment of not less than one year which may extend to five years, and shall also be liable to fine.'
          }
        ],
        telugu: {
          meaning: 'BNS సెక్షన్ 74 మహిళ గౌరవానికి భంగం కలిగించేలా దాడి చేయడం లేదా నేరపూరిత బలాన్ని ఉపయోగించడాన్ని 1 నుండి 5 సంవత్సరాల జైలు శిక్షతో శిక్షిస్తుంది.',
          keyPoints: 'ఇది బెయిల్ రహిత కాగ్నిజబుల్ నేరం.'
        },
        hindi: {
          meaning: 'बीएनएस धारा 74 किसी महिला की लज्जा भंग करने के इरादे से उस पर हमला या आपराधिक बल प्रयोग करने को 1 से 5 वर्ष के कारावास से दंडित करती है।',
          keyPoints: 'यह एक संज्ञेय और गैर-जमानती अपराध है।'
        }
      },
      '75': {
        sectionNumber: '75',
        heading: 'Sexual harassment and punishment for sexual harassment',
        status: 'Active & In Force (Effective 1 July 2024)',
        simpleMeaning: 'BNS Section 75 defines sexual harassment as unwelcome physical contact, demand or request for sexual favors, showing pornography against a woman’s will, or making sexually colored remarks.',
        keyPoints: [
          'Punishment: Imprisonment up to 3 years, or fine, or both for physical advances or demands for sexual favors.',
          'Sexually colored remarks: Imprisonment up to 1 year, or fine, or both.',
          'Parallel recourse: Criminal charges under BNS 75 can run alongside workplace POSH proceedings.'
        ],
        hypotheticalExample: '[HYPOTHETICAL EDUCATIONAL SCENARIO — Not a court judgment]\nA manager repeatedly demands sexual favors from a subordinate in exchange for approving her promotion. This acts as both workplace harassment under POSH and a cognizable criminal offense under BNS Section 75 punishable with up to 3 years imprisonment.',
        examNotes: [
          'Replaces IPC Section 354A.',
          'Cognizable and bailable for sub-clause (iv), non-bailable for sub-clauses (i)-(iii).'
        ],
        quizQuestions: [
          {
            id: 'bns_75_q1',
            question: 'Which of the following actions constitutes sexual harassment under BNS Section 75?',
            options: {
              A: 'Physical contact and advances involving unwelcome and explicit sexual overtures',
              B: 'A demand or request for sexual favors',
              C: 'Showing pornography against the will of a woman',
              D: 'All of the above'
            },
            correct: 'D',
            explanation: 'BNS Section 75 encompasses physical contact, demands for sexual favors, showing pornography, and sexually colored remarks.'
          }
        ],
        telugu: {
          meaning: 'BNS సెక్షన్ 75 లైంగిక వేధింపుల నేరాన్ని నిర్వచిస్తుంది. అవాంఛిత శారీరక స్పర్శ, లైంగిక అనుకూలతలను డిమాండ్ చేయడం, లేదా అసభ్యకరమైన వ్యాఖ్యలు చేయడం నేరం.',
          keyPoints: 'ఈ నేరానికి 3 సంవత్సరాల వరకు జైలు శిక్ష లేదా జరిమానా విధించబడుతుంది.'
        },
        hindi: {
          meaning: 'बीएनएस धारा 75 यौन उत्पीड़न को परिभाषित और दंडित करती है। अनचाहा शारीरिक स्पर्श, यौन अनुग्रह की मांग या अश्लील टिप्पणियां इस धारा के तहत दंडनीय अपराध हैं।',
          keyPoints: 'इसके लिए 3 वर्ष तक का कारावास अथवा जुर्माना हो सकता है।'
        }
      },
      '78': {
        sectionNumber: '78',
        heading: 'Stalking',
        status: 'Active & In Force (Effective 1 July 2024)',
        simpleMeaning: 'BNS Section 78 (replacing IPC Section 354D) criminalizes following a woman, contacting or attempting to contact her despite disinterest, or monitoring her use of the internet, email, or electronic communication.',
        keyPoints: [
          'Cyber Stalking Covered: Explicitly penalizes monitoring electronic communication, social media, or internet usage.',
          'Punishment: First conviction carries imprisonment up to 3 years and fine; second conviction up to 5 years and fine.'
        ],
        hypotheticalExample: '[HYPOTHETICAL EDUCATIONAL SCENARIO — Not a court judgment]\nAn individual persistently creates fake social media profiles to send unwanted messages and track a woman’s movements after being blocked. Under BNS Section 78, this constitutes cyber stalking punishable with up to 3 years imprisonment.',
        examNotes: [
          'Replaces IPC Section 354D.',
          'First offense is bailable; second offense is non-bailable.'
        ],
        quizQuestions: [
          {
            id: 'bns_78_q1',
            question: 'Under BNS Section 78, does monitoring a woman’s internet or social media activity against her will constitute stalking?',
            options: {
              A: 'No, cyber monitoring is legal',
              B: 'Yes, electronic and cyber monitoring is explicitly defined as stalking',
              C: 'Only if physical threats are also made',
              D: 'Only if done by a stranger'
            },
            correct: 'B',
            explanation: 'Section 78(1)(ii) explicitly includes monitoring the use by a woman of the internet, email or any other form of electronic communication as stalking.'
          }
        ],
        telugu: {
          meaning: 'BNS సెక్షన్ 78 స్టాకింగ్ (వెంటాడటం లేదా ఆన్‌లైన్‌లో నిఘా పెట్టడం) నేరాన్ని శిక్షిస్తుంది. మొదటిసారి 3 సంవత్సరాలు, రెండోసారి 5 సంవత్సరాల వరకు జైలు శిక్ష విధించబడుతుంది.',
          keyPoints: 'సోషల్ మీడియా మరియు ఇంటర్నెట్ ద్వారా నిఘా పెట్టడం కూడా స్టాకింగ్ కిందకే వస్తుంది.'
        },
        hindi: {
          meaning: 'बीएनएस धारा 78 पीछा करने (Stalking) और साइबर निगरानी को दंडित करती है। पहली बार 3 वर्ष तथा दूसरी बार 5 वर्ष तक की सजा हो सकती है।',
          keyPoints: 'इंटरनेट या सोशल मीडिया पर अनचाही निगरानी भी इस धारा के तहत अपराध है।'
        }
      },
      '85': {
        sectionNumber: '85',
        heading: 'Cruelty by husband or relatives of husband',
        status: 'Active & In Force (Effective 1 July 2024)',
        simpleMeaning: 'BNS Section 85 (replacing IPC Section 498A) penalizes cruelty inflicted upon a woman by her husband or relatives of her husband with imprisonment for a term which may extend to three years and fine.',
        keyPoints: [
          'Definition of Cruelty: Any willful conduct likely to drive the woman to commit suicide or cause grave injury, or harassment for unlawful dowry demands.',
          'Cognizable & Non-Bailable: Serious criminal offense investigated by police.'
        ],
        hypotheticalExample: '[HYPOTHETICAL EDUCATIONAL SCENARIO — Not a court judgment]\nA woman is subjected to systematic physical assaults and dowry demands by her marital family. Under BNS Section 85, police register a non-bailable criminal offense against the husband and relatives.',
        examNotes: [
          'Replaces IPC Section 498A.',
          'Cruelty includes both mental and physical harm.'
        ],
        quizQuestions: [
          {
            id: 'bns_85_q1',
            question: 'What is the maximum term of imprisonment under BNS Section 85 for cruelty by husband or relatives?',
            options: {
              A: '6 months',
              B: 'Up to 3 years, and fine',
              C: '14 years',
              D: 'Fine of Rs. 1,000 only'
            },
            correct: 'B',
            explanation: 'BNS Section 85 provides for imprisonment for a term which may extend to three years and shall also be liable to fine.'
          }
        ],
        telugu: {
          meaning: 'BNS సెక్షన్ 85 భర్త లేదా ఆయన బంధువులు మహిళపై చేసే క్రూరత్వాన్ని (Cruelty) 3 సంవత్సరాల జైలు శిక్షతో శిక్షిస్తుంది.',
          keyPoints: 'వరకట్న వేధింపులు మరియు శారీరక/మానసిక హింస ఈ సెక్షన్ పరిధిలోకి వస్తాయి.'
        },
        hindi: {
          meaning: 'बीएनएस धारा 85 पति या उसके रिश्तेदारों द्वारा महिला के प्रति क्रूरता को 3 वर्ष तक के कारावास और जुर्माने से दंडित करती है।',
          keyPoints: 'दहेज प्रताड़ना और मानसिक/शारीरिक क्रूरता इसके अंतर्गत संज्ञेय अपराध हैं।'
        }
      },
      '351': {
        sectionNumber: '351',
        heading: 'Criminal intimidation',
        status: 'Active & In Force (Effective 1 July 2024)',
        simpleMeaning: 'BNS Section 351 (replacing IPC Section 506) criminalizes threatening another person with injury to their person, reputation, or property to cause alarm or force them to act against their will.',
        keyPoints: [
          'Basic punishment: Imprisonment up to 2 years, or fine, or both.',
          'Aggravated intimidation: If the threat is to cause death, grievous hurt, or destruction of property by fire, imprisonment can extend up to 7 years.',
          'Applicability: Covers face-to-face threats as well as cyber/phone threats.'
        ],
        hypotheticalExample: '[HYPOTHETICAL EDUCATIONAL SCENARIO — Not a court judgment]\nAn ex-partner sends continuous audio notes threatening to pour acid or cause grievous bodily injury unless the victim withdraws a pending complaint. This constitutes aggravated criminal intimidation under BNS Section 351 punishable with up to 7 years imprisonment.',
        examNotes: [
          'Replaces IPC Section 503 and 506.',
          'Essential ingredients: Intention to cause alarm or compel an act.'
        ],
        quizQuestions: [
          {
            id: 'bns_351_q1',
            question: 'What is the enhanced penalty under BNS Section 351 if the threat is to cause death or grievous hurt?',
            options: {
              A: 'Imprisonment up to 1 year',
              B: 'Imprisonment up to 7 years, or fine, or both',
              C: 'Community service only',
              D: 'Capital punishment'
            },
            correct: 'B',
            explanation: 'Under BNS Section 351, if the threat is to cause death, grievous hurt, or destruction of property by fire, the punishment extends up to 7 years imprisonment.'
          }
        ],
        telugu: {
          meaning: 'BNS సెక్షన్ 351 నేరపూరిత బెదిరింపును (Criminal Intimidation) శిక్షిస్తుంది. ప్రాణహాని లేదా పరువు నష్టం కలిగిస్తామని బెదిరించడం నేరం.',
          keyPoints: 'తీవ్రమైన గాయం లేదా ప్రాణహాని బెదిరింపులకు 7 సంవత్సరాల వరకు జైలు శిక్ష విధించవచ్చు.'
        },
        hindi: {
          meaning: 'बीएनएस धारा 351 आपराधिक धमकी (Criminal Intimidation) से संबंधित है। किसी को शारीरिक, मानसिक या संपत्ति की क्षति पहुंचाने की धमकी देना इसके तहत दंडनीय है।',
          keyPoints: 'गंभीर चोट या जान से मारने की धमकी पर 7 वर्ष तक की सजा हो सकती है।'
        }
      }
    }
  },
  'bnss': {
    actName: 'Bharatiya Nagarik Suraksha Sanhita, 2023',
    actIdentifier: 'BNSS',
    maxSection: 531,
    jurisdiction: 'India (Central Legislation)',
    indiaCodeUrl: 'https://www.indiacode.nic.in/handle/123456789/2023',
    sections: {
      '23': {
        sectionNumber: '23',
        heading: 'Sentence of imprisonment in default of fine',
        status: 'Active & In Force (Effective 1 July 2024)',
        simpleMeaning: 'BNSS Section 23 (replacing CrPC Section 30) defines the limits of imprisonment that a Magistrate\'s court may award in default of payment of fine, ensuring imprisonment in default does not exceed one-fourth of the term of imprisonment the Magistrate is competent to inflict.',
        keyPoints: [
          'Default Imprisonment Limits: Capped at one-fourth of the maximum term competent for that Magistrate.',
          'Procedural Guardrail: Prevents excessive custodial default sentences for indigent persons.'
        ],
        hypotheticalExample: '[HYPOTHETICAL EDUCATIONAL SCENARIO — Not a court judgment]\nA Magistrate sentences an offender to a fine. Under BNSS Section 23, any default imprisonment ordered for failure to pay the fine cannot exceed one-fourth of the Magistrate’s sentencing power.',
        examNotes: [
          'Replaced provision: CrPC Section 30.',
          'One-fourth limit rule under Section 23(1)(b).'
        ],
        quizQuestions: [
          {
            id: 'bnss_23_q1',
            question: 'Under BNSS Section 23, what is the maximum term of imprisonment that may be awarded in default of fine?',
            options: {
              A: 'Equal to the main sentence',
              B: 'Not exceeding one-fourth of the term of imprisonment which the Magistrate is competent to inflict',
              C: 'Flat 10 years',
              D: 'No default imprisonment is permitted'
            },
            correct: 'B',
            explanation: 'Section 23(1)(b) mandates that default imprisonment shall not exceed one-fourth of the term of imprisonment which the Magistrate is competent to inflict.'
          }
        ],
        telugu: {
          meaning: 'BNSS సెక్షన్ 23 జరిమానా చెల్లించనప్పుడు విధించే జైలు శిక్ష పరిమితులను నిర్దేశిస్తుంది.',
          keyPoints: 'మెజిస్ట్రేట్ అధికారంలో ఉన్న గరిష్ట శిక్షలో నాలుగో వంతుకు మించకూడదు.'
        },
        hindi: {
          meaning: 'बीएनएसएस धारा 23 जुर्माना न देने पर कारावास की सजा की सीमा निर्धारित करती है।',
          keyPoints: 'यह अवधि मजिस्ट्रेट द्वारा दी जा सकने वाली अधिकतम सजा के एक-चौथाई से अधिक नहीं होगी।'
        }
      },
      '31': {
        sectionNumber: '31',
        heading: 'Public when to assist Magistrates and police',
        status: 'Active & In Force (Effective 1 July 2024)',
        simpleMeaning: 'BNSS Section 31 (replacing CrPC Section 37) establishes that every member of the public is legally bound to assist a Magistrate or police officer reasonably demanding their aid in preventing an escape, preventing a breach of the peace, or preventing injury to public property.',
        keyPoints: [
          'Public Duty: Affirmative legal duty on citizens to aid law enforcement when reasonably demanded.',
          'Specified Categories: Preventing escape, suppression of violent breach of peace, and injury to railways/public property.'
        ],
        hypotheticalExample: '[HYPOTHETICAL EDUCATIONAL SCENARIO — Not a court judgment]\nA police officer attempting to apprehend an escaping violent suspect demands assistance from bystanders to block a corridor. Under BNSS Section 31, citizens are legally bound to render reasonable aid.',
        examNotes: [
          'Replaces CrPC Section 37.',
          'Failure to assist can trigger penal sanctions under BNS.'
        ],
        quizQuestions: [
          {
            id: 'bnss_31_q1',
            question: 'Under BNSS Section 31, when is the public bound to assist a police officer or Magistrate?',
            options: {
              A: 'Only during formal court sessions',
              B: 'Upon reasonable demand in preventing escape of suspects or suppressing breach of peace',
              C: 'Only if paid an honorarium',
              D: 'Never'
            },
            correct: 'B',
            explanation: 'BNSS Section 31 binds every person to assist a Magistrate or police officer reasonably demanding aid in preventing escape, breach of peace, or damage to property.'
          }
        ],
        telugu: {
          meaning: 'BNSS సెక్షన్ 31 శాంతిభద్రతల పరిరక్షణలో మరియు నిందితులు తప్పించుకోకుండా పోలీసులకు సహాయం చేయడం ప్రజల బాధ్యత అని తెలుపుతుంది.',
          keyPoints: 'పోలీసులు న్యాయబద్ధంగా సహాయం కోరినప్పుడు ప్రజలు సహకరించాలి.'
        },
        hindi: {
          meaning: 'बीएनएसएस धारा 31 के अनुसार पुलिस या मजिस्ट्रेट द्वारा सहायता मांगे जाने पर शांति बनाए रखने या अपराधी को पकड़ने में मदद करना जनता का कर्तव्य है।',
          keyPoints: 'उचित मांग पर सहायता प्रदान करना प्रत्येक नागरिक का वैधानिक दायित्व है।'
        }
      },
      '173': {
        sectionNumber: '173',
        heading: 'Information in cognizable cases (Mandatory FIR Registration)',
        status: 'Active & In Force (Effective 1 July 2024)',
        simpleMeaning: 'BNSS Section 173 (which replaces CrPC Section 154) mandates that every officer in charge of a police station MUST register an FIR upon receiving information disclosing a cognizable offense. It also legalizes electronic reporting (e-FIR) and Zero FIR.',
        keyPoints: [
          'Mandatory Registration: If the complaint discloses a cognizable offense (like assault, rape, domestic violence, criminal intimidation), police cannot refuse or stall FIR registration.',
          'Zero FIR: Information can be lodged at ANY police station regardless of territory, which then transfers it to the jurisdictional station.',
          'Electronic Information: Can be sent electronically; the informant must sign within 3 days for registration.',
          'Free Copy: The informant is entitled to an immediate copy of the FIR free of cost.'
        ],
        hypotheticalExample: '[HYPOTHETICAL EDUCATIONAL SCENARIO — Not a court judgment]\nA woman is assaulted in a transit zone outside her home district. She walks into the nearest police station. The officer attempts to turn her away, saying the crime occurred in another district. Under BNSS Section 173, the police station must immediately record a Zero FIR, provide her medical assistance, and transfer the case to the competent jurisdiction.',
        examNotes: [
          'Replaced provision: CrPC Section 154.',
          'Landmark authority: Lalita Kumari v. Govt. of U.P. (2014) 2 SCC 1 affirmed that the word "shall" is mandatory.',
          'Preliminary inquiry window: Permitted within 14 days only for specific non-violent exceptions (e.g. commercial disputes, medical negligence).'
        ],
        quizQuestions: [
          {
            id: 'bnss_173_q1',
            question: 'What is a "Zero FIR" under BNSS Section 173?',
            options: {
              A: 'An FIR that carries zero criminal charges',
              B: 'An FIR registered at any police station regardless of place of occurrence, before transfer to jurisdictional station',
              C: 'An FIR that is deleted after 24 hours',
              D: 'An anonymous complaint filed online'
            },
            correct: 'B',
            explanation: 'A Zero FIR allows a victim to lodge an FIR at any police station regardless of territorial jurisdiction, ensuring immediate investigation and evidence preservation.'
          }
        ],
        telugu: {
          meaning: 'BNSS సెక్షన్ 173 (పాత CrPC 154 స్థానంలో) కాగ్నిజబుల్ నేరాల విషయంలో తప్పనిసరిగా ఎఫ్.ఐ.ఆర్ (FIR) నమోదు చేయాలని నిర్దేశిస్తుంది. ఏ పోలీస్ స్టేషన్‌లోనైనా జీరో ఎఫ్.ఐ.ఆర్ నమోదు చేయవచ్చు.',
          keyPoints: 'బాధితురాలికి ఎఫ్.ఐ.ఆర్ ఉచిత నకలు (free copy) తక్షణమే అందించాలి.'
        },
        hindi: {
          meaning: 'बीएनएसएस (BNSS) की धारा 173 (पूर्व सीआरपीसी 154) संज्ञेय अपराधों में अनिवार्य एफआईआर दर्ज करने का निर्देश देती है। जीरो एफआईआर के तहत किसी भी थाने में शिकायत दर्ज कराई जा सकती है।',
          keyPoints: 'शिकायतकर्ता को एफआईआर की एक प्रति तत्काल मुफ्त दी जानी अनिवार्य है।'
        }
      },
      '175': {
        sectionNumber: '175',
        heading: 'Police officer\'s power to investigate cognizable case',
        status: 'Active & In Force (Effective 1 July 2024)',
        simpleMeaning: 'BNSS Section 175 (replacing CrPC Section 156) gives police officers full statutory authority to investigate any cognizable case without requiring an order from a Magistrate.',
        keyPoints: [
          'Independent Investigation: Police do not require judicial permission to initiate investigation into cognizable offenses.',
          'Magistrate Oversight: Section 175(3) empowers a Magistrate to order investigation if police fail to act.'
        ],
        hypotheticalExample: '[HYPOTHETICAL EDUCATIONAL SCENARIO — Not a court judgment]\nA complaint discloses an immediate threat of armed assault. Police immediately initiate forensic scene inspection and witness examination under Section 175 without waiting for court directions.',
        examNotes: [
          'Replaced provision: CrPC Section 156.',
          'Section 175(3) corresponds to Section 156(3) CrPC for Magistrate-directed investigations.'
        ],
        quizQuestions: [
          {
            id: 'bnss_175_q1',
            question: 'Under BNSS Section 175(1), do police need an order from a Magistrate to investigate a cognizable case?',
            options: {
              A: 'Yes, prior court order is always mandatory',
              B: 'No, police have independent statutory power to investigate without Magistrate order',
              C: 'Only if the offense occurs at night',
              D: 'Only if the accused is a public servant'
            },
            correct: 'B',
            explanation: 'Section 175(1) authorizes any officer in charge of a police station to investigate any cognizable case without the order of a Magistrate.'
          }
        ],
        telugu: {
          meaning: 'BNSS సెక్షన్ 175 కాగ్నిజబుల్ నేరాలలో మెజిస్ట్రేట్ అనుమతి లేకుండానే పోలీసులు దర్యాప్తు ప్రారంభించవచ్చని స్పష్టం చేస్తుంది.',
          keyPoints: 'పోలీసులు స్వతంత్రంగా దర్యాప్తు చేసే చట్టబద్ధమైన అధికారం కలిగి ఉంటారు.'
        },
        hindi: {
          meaning: 'बीएनएसएस धारा 175 पुलिस को संज्ञेय मामलों में मजिस्ट्रेट के आदेश के बिना सीधे जांच करने का अधिकार देती है।',
          keyPoints: 'संज्ञेय अपराधों में पुलिस बिना किसी न्यायिक अनुमति के तत्काल जांच शुरू कर सकती है।'
        }
      },
      '176': {
        sectionNumber: '176',
        heading: 'Procedure for investigation and forensic videography',
        status: 'Active & In Force (Effective 1 July 2024)',
        simpleMeaning: 'BNSS Section 176 (replacing CrPC Section 157) defines the standard procedure for investigation and mandates forensic examination and audio-video recording (videography) of search and seizure operations.',
        keyPoints: [
          'Forensic Mandate: Mandates forensic expert visit to crime scenes for offenses punishable with 7 years or more.',
          'Videography of Evidence: Mandates electronic videography of search and seizure to prevent tampering.'
        ],
        hypotheticalExample: '[HYPOTHETICAL EDUCATIONAL SCENARIO — Not a court judgment]\nInvestigating a grave physical assault, the police team records complete videography of the crime scene and coordinates with forensic experts as mandated by BNSS Section 176.',
        examNotes: [
          'Key Modernization: Mandatory forensic expert visit and video recording of scene.'
        ],
        quizQuestions: [
          {
            id: 'bnss_176_q1',
            question: 'What technological safeguard was formally mandated in crime scene investigation under BNSS Section 176?',
            options: {
              A: 'Typewritten statements only',
              B: 'Forensic inspection and audio-video recording of search and seizure',
              C: 'No electronic records are permissible',
              D: 'Handwritten telegraphs'
            },
            correct: 'B',
            explanation: 'BNSS Section 176 mandates forensic inspection and audio-video electronic recording of search and crime scenes.'
          }
        ],
        telugu: {
          meaning: 'BNSS సెక్షన్ 176 నేర స్థలాలలో ఫోరెన్సిక్ పరీక్ష మరియు ఆడియో-వీడియో రికార్డింగ్‌ను తప్పనిసరి చేస్తుంది.',
          keyPoints: 'దర్యాప్తు పారదర్శకత కోసం వీడియో రికార్డింగ్ తప్పనిసరి.'
        },
        hindi: {
          meaning: 'बीएनएसएस धारा 176 जांच प्रक्रिया और घटनास्थल की फोरेंसिक जांच तथा वीडियोग्राफी को अनिवार्य बनाती है।',
          keyPoints: 'तलाशी और जब्ती की ऑडियो-वीडियो रिकॉर्डिंग अब अनिवार्य है।'
        }
      }
    }
  }
};

class LegalStudyService {
  /**
   * Resolves Act and Section from user query and conversational context
   * @param {string} text - User message text
   * @param {Object} [sessionContext] - Session context with lastAct, history, etc.
   * @returns {{
   *   actKey: string|null,
   *   secNum: string|null,
   *   baseSecNum: string|null,
   *   subSection: string|null,
   *   isAmbiguous: boolean,
   *   isOutOfBounds: boolean,
   *   clarificationPrompt?: string,
   *   errorPrompt?: string,
   *   explicitActGiven: boolean
   * }}
   */
  resolveActAndSection(text, sessionContext = {}) {
    const rawMessage = (text || '').trim();
    const rawLower = rawMessage.toLowerCase();
    const norm = rawLower.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, ' ').replace(/\s{2,}/g, ' ').trim();

    // 1. Extract Section Reference (preserving subsections like 3(1) or 23(2))
    let secNum = null;
    let baseSecNum = null;
    let subSection = null;
    let allSecNums = [];
    let isComparison = norm.includes('compare') || norm.includes('comparison') || norm.includes('difference') || norm.includes('distinguish');

    // Multi-section pattern: e.g. "Sections 17, 18 and 19", "Sections 17 and 18", "Sections 17, 18, 19"
    const multiSecMatch = rawMessage.match(/\b(?:sections|section|sec|s\.)\s*([0-9\s,\&and]+)/i);
    if (multiSecMatch) {
      const numbers = multiSecMatch[1].match(/\b\d+\b/g);
      if (numbers && numbers.length > 0) {
        allSecNums = Array.from(new Set(numbers));
        secNum = numbers[0];
      }
    }

    // Direct section patterns: "Section 3(1)", "section 23", "sec 31", "s. 18", "section 18"
    if (!secNum) {
      const secMatch = rawMessage.match(/\b(?:section|sec|s\.)\s*(\d+[a-z]?(?:\s*\([^)]+\))*)/i);
      if (secMatch) {
        secNum = secMatch[1].replace(/\s+/g, '');
        allSecNums = [secNum];
      } else {
        // Also match phrases like "explain 3", "what is 23", "study section 31", or isolated numbers if query is section-oriented
        const bareMatch = norm.match(/\b(?:explain|what is|about|tell me about|study)?\s*(\d{1,4})\b/);
        if (bareMatch && (norm.includes('section') || norm.includes('sec') || norm.includes('explain') || norm.includes('act') || norm.includes('pwdva') || norm.includes('bns') || norm.includes('bnss') || norm.includes('pocso'))) {
          secNum = bareMatch[1];
          allSecNums = [secNum];
        }
      }
    }

    // Contextual fallback: If no explicit section in text, check previous conversation context
    if (!secNum && sessionContext && sessionContext.lastSection) {
      secNum = String(sessionContext.lastSection);
      allSecNums = [secNum];
    }

    if (allSecNums.length > 1) {
      isComparison = true;
    }

    if (secNum) {
      const baseMatch = secNum.match(/^(\d+)/);
      baseSecNum = baseMatch ? baseMatch[1] : secNum;
      const subMatch = secNum.match(/\(([^)]+)\)/);
      subSection = subMatch ? subMatch[1] : null;
    }

    // 2. Detect EXPLICIT Act mentions in CURRENT text
    let actKey = null;
    let explicitActGiven = false;

    if (norm.includes('pwdva') || norm.includes('domestic violence') || norm.includes('protection of women')) {
      actKey = 'pwdva';
      explicitActGiven = true;
    } else if (norm.includes('bnss') || norm.includes('nagarik suraksha') || norm.includes('crpc')) {
      actKey = 'bnss';
      explicitActGiven = true;
    } else if (norm.includes('bns') || norm.includes('nyaya sanhita') || norm.includes('ipc')) {
      actKey = 'bns';
      explicitActGiven = true;
    } else if (norm.includes('pocso') || norm.includes('child sexual') || norm.includes('protection of children')) {
      actKey = 'pocso';
      explicitActGiven = true;
    }

    // Contextual fallback: If Act not mentioned in current message, inspect sessionContext
    // BUT an explicit Act in the current query ALWAYS overrides prior session context!
    if (!explicitActGiven && sessionContext) {
      if (sessionContext.lastAct) {
        const last = String(sessionContext.lastAct).toLowerCase();
        if (last.includes('pwdva') || last.includes('domestic')) actKey = 'pwdva';
        else if (last.includes('bnss') || last.includes('nagarik')) actKey = 'bnss';
        else if (last.includes('bns') || last.includes('nyaya')) actKey = 'bns';
        else if (last.includes('pocso')) actKey = 'pocso';
      }
    }

    // 3. Ambiguity evaluation
    // If a section is requested, but NO Act is specified and NO sessionContext Act exists:
    if (secNum && !actKey) {
      let clarificationPrompt = '';
      const b = baseSecNum;

      if (b === '3') {
        clarificationPrompt = `Section 3 appears in multiple Indian laws, including the Protection of Women from Domestic Violence Act, 2005 (PWDVA — Definition of domestic violence), the Protection of Children from Sexual Offences Act, 2012 (POCSO — Penetrative sexual assault), and the Bharatiya Nyaya Sanhita, 2023 (BNS — General criminal liability principles).\n\nWhich specific Act would you like me to explain?`;
      } else if (b === '23') {
        clarificationPrompt = `Section 23 appears in multiple Indian laws, including the Protection of Women from Domestic Violence Act, 2005 (PWDVA — Interim and ex-parte orders), the Protection of Children from Sexual Offences Act, 2012 (POCSO — Media procedure and identity protection), the Bharatiya Nyaya Sanhita, 2023 (BNS — Act of child of immature understanding), and the Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS — Sentence in default of fine).\n\nWhich specific Act would you like me to explain?`;
      } else if (b === '31') {
        clarificationPrompt = `Section 31 appears in multiple Indian laws, including the Protection of Women from Domestic Violence Act, 2005 (PWDVA — Penalty for breach of protection order), the Protection of Children from Sexual Offences Act, 2012 (POCSO — Application of CrPC/BNSS to Special Court), the Bharatiya Nyaya Sanhita, 2023 (BNS — Consent given under fear or misconception), and the Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS — Public duty to assist Magistrates/Police).\n\nWhich specific Act would you like me to explain?`;
      } else if (b === '18') {
        clarificationPrompt = `There are different Indian safety laws that contain a Section 18 (for instance, PWDVA Section 18 concerns Protection Orders, whereas other codes provide different provisions).\n\nWhich specific Act would you like me to explain?`;
      } else if (b === '19') {
        clarificationPrompt = `There are different Indian safety laws that contain a Section 19 (for instance, PWDVA Section 19 concerns Residence Orders, whereas POCSO Section 19 concerns Mandatory Reporting).\n\nWhich specific Act would you like me to explain?`;
      } else if (b === '173') {
        clarificationPrompt = `There are different Indian laws with a Section 173 (for instance, BNSS Section 173 concerns mandatory FIR registration).\n\nWhich specific Act would you like me to explain?`;
      } else {
        clarificationPrompt = `There are different Indian safety laws that contain a Section ${secNum} (such as PWDVA 2005, BNS 2023, BNSS 2023, or POCSO 2012).\n\nWhich specific Act would you like me to explain?`;
      }

      return {
        actKey: null,
        secNum,
        baseSecNum,
        subSection,
        isAmbiguous: true,
        isOutOfBounds: false,
        clarificationPrompt,
        explicitActGiven: false
      };
    }

    // 4. Statutory Boundary / Out of Bounds Validation
    let isOutOfBounds = false;
    let errorPrompt = null;
    if (actKey && secNum && STATUTORY_SECTIONS[actKey]) {
      const actData = STATUTORY_SECTIONS[actKey];
      const numVal = parseInt(baseSecNum, 10);
      if (!isNaN(numVal) && actData.maxSection && (numVal < 1 || numVal > actData.maxSection)) {
        isOutOfBounds = true;
        errorPrompt = `The ${actData.actName} (${actData.actIdentifier}) contains only ${actData.maxSection} sections. Section ${secNum} does not exist in this Act. Please check the section number or consult the official India Code repository at ${actData.indiaCodeUrl}.`;
      }
    }

    return {
      actKey,
      secNum,
      baseSecNum,
      subSection,
      allSecNums,
      isComparison,
      isAmbiguous: false,
      isOutOfBounds,
      errorPrompt,
      explicitActGiven
    };
  }

  /**
   * Generates a multi-section comparison guide
   */
  async generateSectionsComparison(actKey, secNums = [], options = {}) {
    const actData = STATUTORY_SECTIONS[actKey];
    if (!actData) return null;

    const cleanSecNums = Array.isArray(secNums) && secNums.length > 0 ? secNums : ['17', '18', '19'];
    const sectionsData = [];

    for (const num of cleanSecNums) {
      const baseNum = String(num).replace(/[^0-9]/g, '');
      const sec = actData.sections[baseNum] || actData.sections[num];
      if (sec) {
        sectionsData.push({
          num: sec.sectionNumber,
          heading: sec.heading,
          simpleMeaning: sec.simpleMeaning,
          keyPoints: sec.keyPoints,
          hypotheticalExample: sec.hypotheticalExample
        });
      }
    }

    if (sectionsData.length === 0) return null;

    const sectionsSummary = sectionsData.map(s => (
      `### Section ${s.num}: ${s.heading}\n` +
      `• **Meaning**: ${s.simpleMeaning}\n` +
      `• **Key Scope**: ${s.keyPoints.slice(0, 2).join(' ')}`
    )).join('\n\n');

    const fullText = [
      `### ⚖️ Comparison of Sections in ${actData.actName} (${actData.actIdentifier})`,
      `This analysis contrasts Sections ${sectionsData.map(s => s.num).join(', ')} under ${actData.actIdentifier}:`,
      ``,
      sectionsSummary,
      ``,
      `### Key Distinctions & Interplay`,
      `• **Substantive Right vs. Injunctive Remedy**: Section 17 establishes the fundamental substantive civil right of every woman in a domestic relationship to live in the shared household without unlawful eviction. Section 18 grants Magistrates the injunctive power to issue Protection Orders (restraining contact, violence, and communication). Section 19 provides specific Residence Orders to preserve possession, exclude abusers, or secure alternative accommodation.`,
      `• **Emergency Ex-Parte Protection**: Interim orders under Sections 18 and 19 can be granted ex-parte under Section 23 on the basis of an affidavit.`,
      `• **Penal Enforcement**: Breach of a Section 18 protection order is a cognizable and non-bailable criminal offense under Section 31 (up to 1 year imprisonment).`,
      ``,
      `### Official Sources`,
      `• [India Code — ${actData.actName}](${actData.indiaCodeUrl})`
    ].join('\n');

    return {
      actName: actData.actName,
      actIdentifier: actData.actIdentifier,
      sectionNumbers: sectionsData.map(s => s.num),
      fullText,
      structuredData: {
        actName: actData.actName,
        sectionNumber: `Sections ${sectionsData.map(s => s.num).join(', ')}`,
        simpleAnswer: `Comparison of ${actData.actIdentifier} Sections ${sectionsData.map(s => s.num).join(', ')}: Section 17 declares the substantive right to shared household, Section 18 empowers courts to pass Protection Orders, and Section 19 provides specific Residence Orders.`,
        whatItMeans: `These sections operate together to provide rapid, comprehensive civil protection against domestic violence and eviction.`,
        practicalTerms: `A victim can simultaneously seek a protection order under Section 18 and a residence order under Section 19 to secure safety and housing.`,
        verifiedCases: [],
        sources: [{ title: `India Code: ${actData.actName}`, url: actData.indiaCodeUrl }]
      }
    };
  }

  /**
   * Generates 8-part structured legal study guide for a given Act and Section
   */
  async generateSectionStudyGuide(actKey, secNum, options = {}) {
    const actData = STATUTORY_SECTIONS[actKey];
    if (!actData) {
      return null;
    }

    // Check direct match, or base section match (e.g. "3(1)" matching "3")
    let secData = actData.sections[secNum];
    let baseSec = secNum;
    if (!secData && typeof secNum === 'string') {
      const baseMatch = secNum.match(/^(\d+)/);
      if (baseMatch && actData.sections[baseMatch[1]]) {
        secData = actData.sections[baseMatch[1]];
        baseSec = baseMatch[1];
      }
    }

    // Check if section is out of statutory bounds
    const numVal = parseInt(baseSec || secNum, 10);
    if (!secData) {
      if (!isNaN(numVal) && actData.maxSection && (numVal < 1 || numVal > actData.maxSection)) {
        return {
          isOutOfBounds: true,
          actName: actData.actName,
          actIdentifier: actData.actIdentifier,
          sectionNumber: secNum,
          errorPrompt: `The ${actData.actName} (${actData.actIdentifier}) contains only ${actData.maxSection} sections. Section ${secNum} does not exist in this Act. Please check the section number or consult the official India Code repository at ${actData.indiaCodeUrl}.`
        };
      }

      // Valid section within bounds, but not pre-compiled in detail:
      return {
        isUncatalogedWithinBounds: true,
        actName: actData.actName,
        actIdentifier: actData.actIdentifier,
        sectionNumber: secNum,
        heading: `Statutory Provision under ${actData.actIdentifier}`,
        fullText: `### A. Section and Act\n• **Act**: ${actData.actName}\n• **Section**: Section ${secNum}\n• **Jurisdiction**: ${actData.jurisdiction}\n• **Official Source Link**: [India Code Official Repository](${actData.indiaCodeUrl})\n\n### B. Statutory Context\nSection ${secNum} forms an integral statutory part of the ${actData.actName} (Sections 1 to ${actData.maxSection}). Detailed statutory analysis and annotations are available on India Code.\n\n### C. Official Source\n• [India Code — ${actData.actName}](${actData.indiaCodeUrl})`,
        structuredData: {
          actIdentifier: actData.actIdentifier,
          actName: actData.actName,
          sectionNumber: `Section ${secNum}`,
          baseSectionNumber: secNum,
          simpleAnswer: `Section ${secNum} is part of the ${actData.actName} (Sections 1 to ${actData.maxSection}).`,
          whatItMeans: `Official statutory text and legal commentary are accessible through the India Code repository.`,
          practicalTerms: `Refer to India Code or consult qualified legal counsel for detailed procedural interpretation.`,
          verifiedCases: [],
          quizQuestions: [],
          sources: [
            { title: `India Code: ${actData.actName}`, url: actData.indiaCodeUrl }
          ]
        }
      };
    }

    // Search verified court cases from PostgreSQL
    let verifiedCases = [];
    try {
      verifiedCases = await assistantDbService.searchCaseStudies({
        actIdentifier: actData.actIdentifier,
        sectionNumber: baseSec || secNum,
        limit: 3
      });
    } catch (err) {
      console.warn('[LegalStudyService] Error searching PostgreSQL case studies:', err.message);
    }

    // Format Case Studies section
    let caseStudiesContent = '';
    if (verifiedCases && verifiedCases.length > 0) {
      caseStudiesContent = verifiedCases.map((c, i) => {
        const sourceUrl = (c.source_urls && c.source_urls[0]) || actData.indiaCodeUrl;
        return `**Case ${i + 1}: ${c.title}**\n` +
          `• **Court & Date**: ${c.court} (${c.judgment_date ? new Date(c.judgment_date).getFullYear() : 'Verified Precedent'})\n` +
          `• **Case No/Citation**: ${c.case_number || 'Official Record'}\n` +
          `• **Facts**: ${c.facts_summary}\n` +
          `• **Ruling & Reasoning**: ${c.reasoning_summary}\n` +
          `• **Takeaway for Students**: ${c.educational_takeaways}\n` +
          `• **Official Source**: [${c.source_titles && c.source_titles[0] ? c.source_titles[0] : 'Authoritative Legal Record'}](${sourceUrl})`;
      }).join('\n\n');
    } else {
      caseStudiesContent = `*No verified real-world court case is currently cataloged for Section ${secNum} in our verified database.*\n\n` +
        `**Hypothetical Case Illustration [NOT A REAL COURT JUDGMENT]:**\n` +
        secData.hypotheticalExample;
    }

    // Language handling
    const language = options.language || 'english';
    let meaningText = secData.simpleMeaning;
    let keyPointsText = secData.keyPoints.map(p => `• ${p}`).join('\n');

    if (language === 'telugu' && secData.telugu) {
      meaningText = `${secData.telugu.meaning}\n\n${secData.simpleMeaning}`;
      keyPointsText = secData.telugu.keyPoints;
    } else if (language === 'hindi' && secData.hindi) {
      meaningText = `${secData.hindi.meaning}\n\n${secData.simpleMeaning}`;
      keyPointsText = secData.hindi.keyPoints;
    }

    // Construct full 8-Part Structured Tutorial
    const fullText = [
      `### A. Section and Act`,
      `• **Act**: ${actData.actName}`,
      `• **Section**: Section ${secData.sectionNumber} — ${secData.heading}`,
      `• **Jurisdiction**: ${actData.jurisdiction}`,
      `• **Current Status**: ${secData.status}`,
      `• **Official Source Link**: [India Code Official Repository](${actData.indiaCodeUrl})`,
      ``,
      `### B. Meaning in Simple English`,
      meaningText,
      ``,
      `### C. Important Legal Points`,
      keyPointsText,
      ``,
      `### D. Practical Hypothetical Example`,
      secData.hypotheticalExample,
      ``,
      `### E. Real Legal Case Studies`,
      caseStudiesContent,
      ``,
      `### F. Exam Revision Notes`,
      secData.examNotes.map(n => `• ${n}`).join('\n'),
      ``,
      `### G. Practice Questions`,
      secData.quizQuestions.map((q, idx) => {
        const opts = Object.entries(q.options).map(([k, v]) => `  ${k}. ${v}`).join('\n');
        return `**Q${idx + 1}. ${q.question}**\n${opts}\n*(Correct Answer: ${q.correct} — ${q.explanation})*`;
      }).join('\n\n'),
      ``,
      `### H. Authoritative Sources`,
      `• [India Code — ${actData.actName}](${actData.indiaCodeUrl})\n• Verified Court Judgment Repositories`
    ].join('\n');

    return {
      actName: actData.actName,
      actIdentifier: actData.actIdentifier,
      sectionNumber: secData.sectionNumber,
      heading: secData.heading,
      fullText,
      structuredData: {
        actIdentifier: actData.actIdentifier,
        actName: actData.actName,
        sectionNumber: `Section ${secData.sectionNumber}`,
        baseSectionNumber: secData.sectionNumber,
        simpleAnswer: secData.simpleMeaning,
        whatItMeans: keyPointsText,
        practicalTerms: secData.hypotheticalExample,
        verifiedCases: verifiedCases,
        quizQuestions: secData.quizQuestions,
        sources: [
          { title: `India Code: ${actData.actName}`, url: actData.indiaCodeUrl }
        ]
      }
    };
  }

  /**
   * Serves an interactive quiz question for a section
   */
  getQuizQuestion(actKey, secNum, questionIndex = 0) {
    const actData = STATUTORY_SECTIONS[actKey];
    if (!actData) return null;
    let secData = actData.sections[secNum];
    if (!secData && typeof secNum === 'string') {
      const baseMatch = secNum.match(/^(\d+)/);
      if (baseMatch && actData.sections[baseMatch[1]]) {
        secData = actData.sections[baseMatch[1]];
      }
    }
    if (!secData || !secData.quizQuestions || secData.quizQuestions.length === 0) return null;

    const safeIndex = Math.min(Math.max(0, questionIndex), secData.quizQuestions.length - 1);
    const q = secData.quizQuestions[safeIndex];

    return {
      actIdentifier: actData.actIdentifier,
      sectionNumber: secData.sectionNumber,
      questionIndex: safeIndex,
      totalQuestions: secData.quizQuestions.length,
      questionId: q.id,
      question: q.question,
      options: q.options,
      correct: q.correct,
      explanation: q.explanation
    };
  }

  /**
   * Resumes continuous study session from user's progress
   */
  async resumeStudySession(userId, actKey, secNum) {
    const actData = STATUTORY_SECTIONS[actKey];
    if (!actData) return null;
    let secData = actData.sections[secNum];
    if (!secData && typeof secNum === 'string') {
      const baseMatch = secNum.match(/^(\d+)/);
      if (baseMatch && actData.sections[baseMatch[1]]) {
        secData = actData.sections[baseMatch[1]];
      }
    }
    if (!secData) return null;

    let progress = null;
    try {
      progress = await assistantDbService.getStudyProgress(userId, actData.actIdentifier, secNum);
    } catch (_) {}

    const stepIndex = progress ? (progress.step_index + 1) % 5 : 0;
    const stepNames = [
      'Meaning & Basics',
      'Important Legal Points',
      'Hypothetical Practical Application',
      'Verified Court Precedents',
      'Exam Revision & Practice Quiz'
    ];

    let content = '';
    if (stepIndex === 0) {
      content = `**Step 1: ${secData.heading} — Core Meaning**\n\n${secData.simpleMeaning}\n\n*Say "Next point" to proceed to Important Legal Points.*`;
    } else if (stepIndex === 1) {
      content = `**Step 2: Important Legal Points**\n\n${secData.keyPoints.map(p => `• ${p}`).join('\n')}\n\n*Say "Next point" to see a practical scenario.*`;
    } else if (stepIndex === 2) {
      content = `**Step 3: Practical Hypothetical Example**\n\n${secData.hypotheticalExample}\n\n*Say "Next point" to examine verified real court precedents.*`;
    } else if (stepIndex === 3) {
      const cases = await assistantDbService.searchCaseStudies({ actIdentifier: actData.actIdentifier, sectionNumber: secNum, limit: 1 });
      if (cases && cases.length > 0) {
        const c = cases[0];
        content = `**Step 4: Verified Court Precedent**\n\n**${c.title}** (${c.court})\n• **Facts**: ${c.facts_summary}\n• **Ruling**: ${c.reasoning_summary}\n• **Takeaway**: ${c.educational_takeaways}\n\n*Say "Quiz me" to test your understanding!*`;
      } else {
        content = `**Step 4: Court Application & Precedents**\n\nCourts strictly interpret Section ${secNum} to protect victim autonomy and statutory dignity.\n\n*Say "Quiz me" to test your understanding!*`;
      }
    } else {
      content = `**Step 5: Exam Takeaway & Quick Check**\n\n${secData.examNotes.map(n => `• ${n}`).join('\n')}\n\n*Would you like to take a practice quiz on Section ${secNum}? Type "Quiz me on Section ${secNum}".*`;
    }

    // Save progress update
    try {
      await assistantDbService.upsertStudyProgress(userId, {
        actIdentifier: actData.actIdentifier,
        sectionNumber: secNum,
        lastTopic: stepNames[stepIndex],
        stepIndex: stepIndex,
        totalSteps: 5,
        completed: stepIndex === 4
      });
    } catch (_) {}

    return {
      stepIndex,
      stepName: stepNames[stepIndex],
      content
    };
  }

  /**
   * Retrieves raw statutory data for a given Act and section
   */
  getStatutoryData(actKey, secNum) {
    if (!actKey || !STATUTORY_SECTIONS[actKey]) return null;
    const act = STATUTORY_SECTIONS[actKey];
    const base = String(secNum || '').replace(/[^0-9]/g, '');
    const section = act.sections[secNum] || act.sections[base] || null;
    return {
      actName: act.actName,
      actIdentifier: act.actIdentifier,
      maxSection: act.maxSection,
      jurisdiction: act.jurisdiction,
      indiaCodeUrl: act.indiaCodeUrl,
      section
    };
  }

  /**
   * Returns list of configured Acts
   */
  getConfiguredActs() {
    return Object.entries(STATUTORY_SECTIONS).map(([key, a]) => ({
      key,
      name: a.actName,
      identifier: a.actIdentifier,
      maxSection: a.maxSection,
      indiaCodeUrl: a.indiaCodeUrl
    }));
  }
}

module.exports = new LegalStudyService();
