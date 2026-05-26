// Shared Configurations & Constants for SafeFlow

export const VALID_SECTORS = ['A', 'B', 'C', 'D', 'E', 'F'];

export const VALID_INCIDENT_TYPES = [
  'women_sos',
  'woman_safety',
  'lost_child',
  'medical_emergency',
  'security_breach',
  'stampede_risk',
  'suspicious_activity',
  'accessibility_help',
  'lost_person',
  'crowd_surge',
  'weather_emergency',
  'unsafe_behavior',
  'exit_blocked',
  'other',
  'clear'
];

export const SOS_CATEGORIES = {
  women_sos: {
    label: 'Woman Safety',
    priority: 'Critical',
    description: 'Solo female attendee requesting urgent safety assistance or escort.',
    defaultResponse: 'Dispatch security guards and establish safe haven escort to Sector A.',
    resources: { stewards: 6, medical: 0, police: 2 }
  },
  woman_safety: {
    label: 'Woman Safety',
    priority: 'Critical',
    description: 'Solo female attendee requesting urgent safety assistance or escort.',
    defaultResponse: 'Dispatch security guards and establish safe haven escort to Sector A.',
    resources: { stewards: 6, medical: 0, police: 2 }
  },
  lost_child: {
    label: 'Lost Child',
    priority: 'Medium',
    description: 'Report of a missing child or unaccompanied minor.',
    defaultResponse: 'Alert perimeter gates, deploy search stewards to sector, monitor camera feeds.',
    resources: { stewards: 4, medical: 0, police: 1 }
  },
  medical_emergency: {
    label: 'Medical Emergency',
    priority: 'High',
    description: 'Attendee collapsed or injured requiring first-aid or EMT response.',
    defaultResponse: 'Dispatch EMT paramedics, clear walkway tunnels for stretcher ingress.',
    resources: { stewards: 2, medical: 3, police: 1 }
  },
  security_breach: {
    label: 'Security Breach',
    priority: 'Critical',
    description: 'Compromised outer perimeter or unauthorized entry to restricted zones.',
    defaultResponse: 'Deploy security reinforcements, alert local authorities, open exits.',
    resources: { stewards: 12, medical: 1, police: 8 }
  },
  stampede_risk: {
    label: 'Stampede Risk',
    priority: 'Critical',
    description: 'High pressure crowd compression or uncontrolled movements near exits.',
    defaultResponse: 'Open overflow barriers immediately, divert flow to Gate 5/6, dispatch stewards.',
    resources: { stewards: 15, medical: 4, police: 6 }
  },
  suspicious_activity: {
    label: 'Suspicious Activity',
    priority: 'Medium',
    description: 'Unattended baggage or suspicious behavior inside the stadium perimeter.',
    defaultResponse: 'Deploy nearest steward patrol to visually scan and verify the reported area.',
    resources: { stewards: 2, medical: 0, police: 1 }
  },
  accessibility_help: {
    label: 'Accessibility Help',
    priority: 'Low',
    description: 'Spectator with restricted mobility requiring assistance or wheelchair transfer.',
    defaultResponse: 'Send accessibility service steward with assistance equipment to location.',
    resources: { stewards: 1, medical: 0, police: 0 }
  },
  lost_person: {
    label: 'Lost Person',
    priority: 'Low',
    description: 'Separated companion or family member reported missing.',
    defaultResponse: 'Broadcast description to all kiosk terminals and sector supervisors.',
    resources: { stewards: 1, medical: 0, police: 0 }
  },
  crowd_surge: {
    label: 'Crowd Surge',
    priority: 'High',
    description: 'Sudden turnstile bottleneck or staircase overcrowding.',
    defaultResponse: 'Redistribute crowd flows, open extra entrance gates, pause intake.',
    resources: { stewards: 8, medical: 1, police: 2 }
  },
  weather_emergency: {
    label: 'Weather Emergency',
    priority: 'High',
    description: 'Severe weather threat risking spectator safety in uncovered stands.',
    defaultResponse: 'Guide crowd to covered corridors and concourses, monitor steps.',
    resources: { stewards: 10, medical: 2, police: 2 }
  },
  unsafe_behavior: {
    label: 'Unsafe Behavior',
    priority: 'Medium',
    description: 'Aggressive behavior, altercation, or intoxication in the stands.',
    defaultResponse: 'Deploy stewards to intervene and de-escalate. Alert local police standby.',
    resources: { stewards: 4, medical: 0, police: 2 }
  },
  exit_blocked: {
    label: 'Emergency Exit Blocked',
    priority: 'High',
    description: 'Concessions or debris obstructing designated fire and exit pathways.',
    defaultResponse: 'Deploy facilities stewards to clear obstruction immediately, reroute exit paths.',
    resources: { stewards: 3, medical: 0, police: 0 }
  },
  other: {
    label: 'Other',
    priority: 'Medium',
    description: 'General safety request not matching standard categories.',
    defaultResponse: 'Deploy supervisor patrol to assess condition and report back.',
    resources: { stewards: 2, medical: 0, police: 0 }
  }
};

/** Adjacency graph representing walkway connections between sectors */
export const SECTOR_GRAPH = {
  A: { B: 1, F: 1 },
  B: { A: 1, C: 1 },
  C: { B: 1, D: 1 },
  D: { C: 1, E: 1 },
  E: { D: 1, F: 1 },
  F: { E: 1, A: 1 }
};

/** SVG Coordinates of Sector nodes for path rendering */
export const SECTOR_COORDINATES = {
  A: { x: 300, y: 114, label: "VIP Box" },
  B: { x: 420, y: 175, label: "East Stand" },
  C: { x: 420, y: 275, label: "North Stand" },
  D: { x: 300, y: 335, label: "Gate 4 Entrance" },
  E: { x: 180, y: 275, label: "West Stand (Low Light)" },
  F: { x: 180, y: 175, label: "Family Zone" }
};

export const LANG_VOICE_CODES = {
  en: 'en-IN',
  hi: 'hi-IN',
  ta: 'ta-IN',
  te: 'te-IN'
};

export const LANG_LABELS = {
  en: 'EN',
  hi: 'हिं'
};

export const UI_TEXT = {
  en: {
    // Nav Bar
    navSOS: 'SOS Help',
    navExit: 'Exit Path',
    navGuide: 'AI Guide',
    navProfile: 'Profile',
    navMonitor: 'Monitor',
    navGate: 'Action Gate',
    navConsole: 'Console',
    navSettings: 'Settings',

    // Headers & Metadata
    activeIncidentsLabel: 'Active Logs',
    roleFan: 'FAN PORTAL',
    roleStaff: 'STAFF PORTAL',
    roleAdmin: 'ADMIN PORTAL',

    // Fan SOS Tab
    sosHeader: 'Women Safety & Emergency SOS',
    sosDesc: 'Trigger a priority security dispatch and Dijkstra-guided escort path to Sector A VIP safe zone.',
    sosLocationLabel: 'Select Your Stand Location:',
    sosDescLabel: 'Situation Details (Optional):',
    sosPlaceholder: 'Describe landmarks or clothes (e.g. green cap)...',
    sosTrigger: 'TRIGGER PRIORITY SOS',

    // Fan Navigation Tab
    navHeader: 'Safe Exit Router',
    navDesc: 'Generate a dynamic walkway path that avoids crowd surges, low light, and incidents.',
    navStartLabel: 'Starting Sector Location:',
    navDestLabel: 'Exit Destination:',
    navProfileLabel: 'Safety Profile:',
    navProfileWoman: 'Solo Woman Attendee (High Priority)',
    navProfileElderly: 'Elderly / Accessible User',
    navProfileChild: 'Child / Family Group',
    navProfileGeneral: 'General Public',
    navTrigger: 'CALCULATE SAFE PATH',
    navResultsHeader: 'Safest Path Solved',
    navCrowdLabel: 'Telemetry Density',
    navLightLabel: 'Lighting Level',
    navWarningsLabel: 'Safety Advisories:',

    // Fan Guide Tab
    guideHeader: 'Speak to AI Safety Guide',
    guideDesc: 'Talk or type to retrieve exit paths, crowd alerts, and SOS updates.',
    guideMicStatusReady: 'Microphone ready. Tap to talk.',
    guideMicStatusListening: 'Listening... speak now.',
    guideInputPlaceholder: 'Type safety question...',
    guideSend: 'Send',
    guideShortcutUnsafe: 'I feel unsafe',
    guideShortcutExit: 'Where should I go?',
    guideShortcutGate4: 'Is Gate 4 crowded?',

    // Fan Profile Tab
    profileHeader: 'User Profile Settings',
    profileNameLabel: 'User:',
    profileRoleLabel: 'Authority Level:',
    profileLangLabel: 'App Display Language / भाषा:',
    profileLogout: 'Log Out',

    // Staff Monitor Tab
    monitorHeader: 'Stadium Telemetry Monitor',
    monitorLegendLow: 'Low (<50%)',
    monitorLegendMed: 'Med (50-80%)',
    monitorLegendHigh: 'High (>80%)',
    monitorLegendIncident: 'Incident',
    forecastHeader: 'Crowd Growth Forecasts',
    forecastCtx: 'Retrieving match minute...',
    sparklineHeader: 'Moving Telemetry Sparkline (3 Min Window)',

    // Staff Action Gate Tab
    approvalsHeader: 'Human-in-the-Loop Action Gate',
    approvalsDesc: 'Review, override, or authorize resource deployment plans formulated by the AI Decision Agent.',
    approvalsEmptyTitle: 'Approval Queue Clear',
    approvalsEmptyDesc: 'No actions pending operator confirmation.',
    approvalsRiskLabel: 'Reported Risk:',
    approvalsActionLabel: 'Primary Response Action:',
    approvalsEscalationLabel: 'Suggested Escalations:',
    approvalsApproveBtn: 'Authorize Operations',
    approvalsRejectBtn: 'Override & Abort',

    // Staff Console Tab
    consolePresetsHeader: 'Command Presets (Simulation Logs)',
    consolePresetsDesc: 'Trigger incident overrides to test the multi-agent reasoning chain.',
    consolePresetSurge: 'Gate 4 Surge',
    consolePresetMedical: 'Sector B Medical',
    consolePresetLostChild: 'Sector F Lost Child',
    consolePresetEvacuate: 'Security Breach',
    consolePresetClear: 'Clear Incidents',
    consolePresetDemo: 'Watch Auto Demo Flow',
    consoleLogsHeader: 'Operations Feed',
    agentHeader: 'Agent Reasoning Pipeline',
    agentToggleBtn: 'Toggle View',
    // Accessibility Preferences
    accessibilityTitle: 'Accessibility Preferences',
    prefVoiceTitle: 'Voice Assistance',
    prefVoiceDesc: 'App automatically reads announcements aloud',
    prefTextTitle: 'Large Text Size',
    prefTextDesc: 'Scale text sizing for easy visibility',
    prefSimpleTitle: 'Simplified Mode',
    prefSimpleDesc: 'Solid high-contrast panels, minimal animations',
    prefContrastTitle: 'High Contrast Mode',
    prefContrastDesc: 'Apply high-contrast black backgrounds and white borders',
    prefFreqLabel: 'Notification Frequency:',
    freqRealtime: 'Real-time alerts',
    freq1Min: 'Every 1 minute',
    freq5Min: 'Every 5 minutes',
    freqMuted: 'Muted',

    // Staff Profile Tab
    staffProfileHeader: 'Operator Settings',
    staffNameLabel: 'User Account:',
    staffRoleLabel: 'Access Role:',
    staffApiLabel: 'API Status:',
    staffApiConnected: 'Secure Connected',
    staffLangLabel: 'Console Display Language / Language:',
    staffLogout: 'Log Out',

    // Sectors UI Select Option Names
    secA: 'VIP Box (Sector A)',
    secB: 'East Stand (Sector B)',
    secC: 'North Stand (Sector C)',
    secD: 'Gate 4 Entrance (Sector D)',
    secE: 'West Stand (Sector E - Low Light)',
    secE_nav: 'West Stand (Sector E)',
    secF: 'Family Zone (Sector F)',

    // Additional keys for full page translation
    agent1Title: 'Awareness (Observe)',
    agent2Title: 'Decision (Coordinate)',
    agent3Title: 'Communication (Act)',
    riskTierLabel: 'Risk Tier',
    actionLabel: 'Action',
    broadcastScriptLabel: 'Broadcast Script',
    detailsToggleShow: '+ Details',
    detailsToggleHide: '- Details',
    offlineMockEngine: 'Engine: SafeFlow Offline Mock Engine (Active)',
    geminiEngine: 'Engine: Gemini 2.5 Flash via Google AI SDK (Active)',
    riskLow: 'Low',
    riskMedium: 'Medium',
    riskHigh: 'High',
    riskCritical: 'Critical',
    riskLevelLabel: 'Risk Level:',
    resStewards: 'Stewards',
    resMedical: 'Medical',
    resPolice: 'Police',
    typeWomenSOS: 'Women Safety SOS',
    typeMedical: 'Medical Distress',
    typeLostChild: 'Lost Child',
    typeSecurityBreach: 'Security Breach',
    typeCrowdSurge: 'Crowd Surge',
    typeEmergency: 'Emergency Alert',
    noIncidents: 'No active incidents reported.',
    trendRising: 'Rising',
    trendFalling: 'Falling',
    trendStable: 'Stable',
    ratingHeavy: 'Heavy',
    ratingModerate: 'Moderate',
    lightHighMed: 'High/Medium',
    lightLowZones: 'Contains Low Light Zones',
    escortMessage: 'Safe Haven destination set. Security personnel dispatched.',
    authTitle: 'Access Safety Terminal',
    authSubtitle: 'Log in to enter the stadium safety network.',
    emailLabel: 'Email Address',
    passwordLabel: 'Password',
    loginBtn: 'Log In',
    demoDivider: 'OR DEMO LOG IN',
    enterAsFan: 'Enter as Fan (Sanjay)',
    enterAsStaff: 'Enter as Staff (Sharma)',
    enterAsAdmin: 'Enter as Admin (Patel)',
    returnLanding: '← Return to Landing Page',
    statusLabel: 'Status',
    guardsCount: 'Guards',
    typeWomanSafety: 'Woman Safety',
    typeLostChild: 'Lost Child',
    typeMedicalEmergency: 'Medical Emergency',
    typeSecurityBreach: 'Security Breach',
    typeStampedeRisk: 'Stampede Risk',
    typeSuspiciousActivity: 'Suspicious Activity',
    typeAccessibilityHelp: 'Accessibility Help',
    typeLostPerson: 'Lost Person',
    typeCrowdSurge: 'Crowd Surge',
    typeWeatherEmergency: 'Weather Emergency',
    typeUnsafeBehavior: 'Unsafe Behavior',
    typeExitBlocked: 'Emergency Exit Blocked',
    typeOther: 'Other'
  },
  hi: {
    // Nav Bar
    navSOS: 'एसओएस सहायता',
    navExit: 'निकास मार्ग',
    navGuide: 'एआई गाइड',
    navProfile: 'प्रोफ़ाइल',
    navMonitor: 'निगरानी',
    navGate: 'स्वीकृति गेट',
    navConsole: 'कंसोल',
    navSettings: 'सेटिंग्स',

    // Headers & Metadata
    activeIncidentsLabel: 'सक्रिय लॉग',
    roleFan: 'दर्शक पोर्टल',
    roleStaff: 'स्टाफ पोर्टल',
    roleAdmin: 'एडमिन पोर्टल',

    // Fan SOS Tab
    sosHeader: 'महिला सुरक्षा और आपातकालीन एसओएस',
    sosDesc: 'प्राथमिकता सुरक्षा दल भेजने और सेक्टर A VIP सुरक्षित क्षेत्र तक सुरक्षित मार्ग प्राप्त करने के लिए क्लिक करें।',
    sosLocationLabel: 'अपना वर्तमान स्थान चुनें:',
    sosDescLabel: 'स्थिति का विवरण (वैकल्पिक):',
    sosPlaceholder: 'पहचान के चिन्ह या कपड़े लिखें (जैसे: हरी टोपी)...',
    sosTrigger: 'आपातकालीन सहायता मांगें',

    // Fan Navigation Tab
    navHeader: 'सुरक्षित निकास मार्गदर्शक',
    navDesc: 'भीड़भाड़, कम रोशनी और दुर्घटनाओं से बचने के लिए गतिशील मार्ग बनाएं।',
    navStartLabel: 'प्रस्थान स्थान stand:',
    navDestLabel: 'निकास गंतव्य:',
    navProfileLabel: 'सुरक्षा प्रोफ़ाइल:',
    navProfileWoman: 'अकेली महिला दर्शक (उच्च प्राथमिकता)',
    navProfileElderly: 'बुजुर्ग / सुलभ उपयोगकर्ता',
    navProfileChild: 'बच्चे / पारिवारिक समूह',
    navProfileGeneral: 'सामान्य जनता',
    navTrigger: 'सुरक्षित रास्ता खोजें',
    navResultsHeader: 'सुरक्षित रास्ता मिला',
    navCrowdLabel: 'भीड़ घनत्व',
    navLightLabel: 'रोशनी का स्तर',
    navWarningsLabel: 'सुरक्षा चेतावनी:',

    // Fan Guide Tab
    guideHeader: 'सुरक्षा एआई से बात करें',
    guideDesc: 'निकास मार्ग, भीड़भाड़ की चेतावनी और एसओएस अपडेट के लिए बोलें या लिखें।',
    guideMicStatusReady: 'माइक्रोफ़ोन तैयार है। बोलें।',
    guideMicStatusListening: 'सुन रहा है... अभी बोलें।',
    guideInputPlaceholder: 'सुरक्षा सवाल लिखें...',
    guideSend: 'भेजें',
    guideShortcutUnsafe: 'मुझे असुरक्षित लग रहा है',
    guideShortcutExit: 'मैं कहाँ जाऊँ?',
    guideShortcutGate4: 'क्या गेट 4 पर भीड़ है?',

    // Fan Profile Tab
    profileHeader: 'उपयोगकर्ता प्रोफ़ाइल सेटिंग्स',
    profileNameLabel: 'उपयोगकर्ता:',
    profileRoleLabel: 'अधिकार स्तर:',
    profileLangLabel: 'ऐप प्रदर्शन भाषा / Language:',
    profileLogout: 'लॉग आउट',

    // Staff Monitor Tab
    monitorHeader: 'स्टेडियम टेलीमेट्री निगरानी',
    monitorLegendLow: 'कम (<50%)',
    monitorLegendMed: 'मध्यम (50-80%)',
    monitorLegendHigh: 'उच्च (>80%)',
    monitorLegendIncident: 'दुर्घटना',
    forecastHeader: 'भीड़ बढ़ने का अनुमान',
    forecastCtx: 'मैच के मिनटों का आंकलन...',
    sparklineHeader: 'टेलीमेट्री ग्राफ (पिछला 3 मिनट)',

    // Staff Action Gate Tab
    approvalsHeader: 'स्वीकृति गेट (ह्यूमन-इन-द-लूप)',
    approvalsDesc: 'एआई डिसीजन एजेंट द्वारा तैयार संसाधन तैनाती योजनाओं की समीक्षा करें, स्वीकृत करें या निरस्त करें।',
    approvalsEmptyTitle: 'स्वीकृति सूची खाली है',
    approvalsEmptyDesc: 'ऑपरेटर की पुष्टि के लिए कोई कार्रवाई लंबित नहीं है।',
    approvalsRiskLabel: 'सूचित जोखिम:',
    approvalsActionLabel: 'प्राथमिक प्रतिक्रिया कार्रवाई:',
    approvalsEscalationLabel: 'सुझाए गए कदम:',
    approvalsApproveBtn: 'कार्यवाही स्वीकृत करें',
    approvalsRejectBtn: 'रद्द करें (ओवरराइड)',

    // Staff Console Tab
    consolePresetsHeader: 'कमांड प्रीसेट (सिमुलेशन लॉग)',
    consolePresetsDesc: 'मल्टी-एजेंट तर्क श्रृंखला का परीक्षण करने के लिए दुर्घटनाओं को सिमुलेट करें।',
    consolePresetSurge: 'Gate 4 भीड़भाड़',
    consolePresetMedical: 'सेक्टर B चिकित्सा आपातकाल',
    consolePresetLostChild: 'सेक्टर F खोया बच्चा',
    consolePresetEvacuate: 'सुरक्षा उल्लंघन',
    consolePresetClear: 'लॉग साफ़ करें',
    consolePresetDemo: 'ऑतो डेमो चलाएं',
    consoleLogsHeader: 'ऑपरेशन्स फीड',
    agentHeader: 'एजेंट रीजनिंग पाइपलाइन',
    agentReadyLabel: 'एजेंट तैयार',
    agentLoadingLabel: 'एलएलएम एजेंट से जानकारी ली जा रही है...',

    // Accessibility Preferences
    accessibilityTitle: 'एक्सेसिबिलिटी प्राथमिकताएं',
    prefVoiceTitle: 'आवाज सहायता',
    prefVoiceDesc: 'ऐप स्वचालित रूप से घोषणाओं को पढ़कर सुनाता है',
    prefTextTitle: 'बड़ा टेक्स्ट आकार',
    prefTextDesc: 'बेहतर दृश्यता के लिए टेक्स्ट का आकार बढ़ाएं',
    prefSimpleTitle: 'सरलीकृत मोड',
    prefSimpleDesc: 'ठोस पृष्ठभूमि और न्यूनतम एनिमेशन',
    prefContrastTitle: 'उच्च कंट्रास्ट मोड',
    prefContrastDesc: 'काली पृष्ठभूमि और सफेद बॉर्डर लागू करें',
    prefFreqLabel: 'अधिसूचना आवृत्ति:',
    freqRealtime: 'वास्तविक समय अलर्ट',
    freq1Min: 'प्रत्येक 1 मिनट',
    freq5Min: 'प्रत्येक 5 मिनट',
    freqMuted: 'म्यूट',

    // Staff Profile Tab
    staffProfileHeader: 'ऑपरेटर सेटिंग्स',
    staffNameLabel: 'उपयोगकर्ता खाता:',
    staffRoleLabel: 'पहुंच भूमिका:',
    staffApiLabel: 'एपीआई स्थिति:',
    staffApiConnected: 'सुरक्षित रूप से कनेक्टेड',
    staffLangLabel: 'कंसोल प्रदर्शन भाषा / Language:',
    staffLogout: 'लॉग आउट',

    // Sectors UI Option Names in Hindi
    secA: 'वीआईपी बॉक्स (सेक्टर A)',
    secB: 'पूर्वी स्टैंड (सेक्टर B)',
    secC: 'उत्तरी स्टैंड (सेक्टर C)',
    secD: 'गेट 4 प्रवेश (सेक्टर D)',
    secE: 'पश्चिमी स्टैंड (सेक्टर E - कम रोशनी)',
    secE_nav: 'पश्चिमी स्टैंड (सेक्टर E)',
    secF: 'फैमिली ज़ोन (सेक्टर F)',

    // Additional keys for full page translation in Hindi
    agent1Title: 'जागरूकता (अवलोकन)',
    agent2Title: 'निर्णय (समन्वय)',
    agent3Title: 'संचार (कार्रवाई)',
    riskTierLabel: 'जोखिम स्तर',
    actionLabel: 'कार्रवाई',
    broadcastScriptLabel: 'प्रसारण स्क्रिप्ट',
    detailsToggleShow: '+ विवरण',
    detailsToggleHide: '- विवरण',
    offlineMockEngine: 'इंजन: SafeFlow ऑफ़लाइन मॉक इंजन (सक्रिय)',
    geminiEngine: 'इंजन: Google AI SDK के माध्यम से जेमिनी 2.5 फ़्लैश (सक्रिय)',
    riskLow: 'कम',
    riskMedium: 'मध्यम',
    riskHigh: 'उच्च',
    riskCritical: 'गंभीर',
    riskLevelLabel: 'जोखिम स्तर:',
    resStewards: 'सुरक्षाकर्मी',
    resMedical: 'मेडिकल टीम',
    resPolice: 'पुलिस बल',
    typeWomenSOS: 'महिला सुरक्षा एसओएस',
    typeMedical: 'चिकित्सा आपातकाल',
    typeLostChild: 'खोया हुआ बच्चा',
    typeSecurityBreach: 'सुरक्षा उल्लंघन',
    typeCrowdSurge: 'भीड़भाड़ खतरा',
    typeEmergency: 'आपातकालीन अलर्ट',
    noIncidents: 'कोई सक्रिय घटना दर्ज नहीं है।',
    trendRising: 'बढ़ रहा है',
    trendFalling: 'घट रहा है',
    trendStable: 'स्थिर',
    ratingHeavy: 'भारी भीड़',
    ratingModerate: 'मध्यम भीड़',
    lightHighMed: 'उच्च/मध्यम',
    lightLowZones: 'कम रोशनी वाले क्षेत्र',
    escortMessage: 'सुरक्षित स्थान का मार्ग निर्धारित। सुरक्षाकर्मी भेजे गए।',
    authTitle: 'सुरक्षा टर्मिनल तक पहुंच',
    authSubtitle: 'स्टेडियम सुरक्षा नेटवर्क में प्रवेश करने के लिए लॉग इन करें।',
    emailLabel: 'ईमेल पता',
    passwordLabel: 'पासवर्ड',
    loginBtn: 'लॉग इन करें',
    demoDivider: 'या डेमो लॉग इन करें',
    enterAsFan: 'दर्शक के रूप में प्रवेश करें (संजय)',
    enterAsStaff: 'स्टाफ के रूप में प्रवेश करें (शर्मा)',
    enterAsAdmin: 'एडमिन के रूप में प्रवेश करें (पटेल)',
    returnLanding: '← लैंडिंग पृष्ठ पर वापस जाएं',
    statusLabel: 'स्थिति',
    guardsCount: 'सुरक्षाकर्मी',
    typeWomanSafety: 'महिला सुरक्षा',
    typeLostChild: 'खोया हुआ बच्चा',
    typeMedicalEmergency: 'चिकित्सा आपातकाल',
    typeSecurityBreach: 'सुरक्षा उल्लंघन',
    typeStampedeRisk: 'भगदड़ का खतरा',
    typeSuspiciousActivity: 'संदिग्ध गतिविधि',
    typeAccessibilityHelp: 'सुलभता सहायता',
    typeLostPerson: 'खोया हुआ व्यक्ति',
    typeCrowdSurge: 'भीड़भाड़ खतरा',
    typeWeatherEmergency: 'मौसम आपातकाल',
    typeUnsafeBehavior: 'असुरक्षित व्यवहार',
    typeExitBlocked: 'निकास अवरुद्ध',
    typeOther: 'अन्य'
  }
};

export const VOICE_RESPONSES = {
  en: {
    unsafe: 'Emergency assistance requested. Security is on the way. Please stay where you are.',
    exit: 'Calculating your safest exit route now.',
    gate4: 'Gate 4 is congested. Please use Gate 5 instead. Stewards will guide you.',
    sos: 'Requesting help now. Security is on the way. Please stay where you are.',
    fallback: 'SafeFlow is here to guide you. Ask for exit routing or tap for emergency help.',
  },
  hi: {
    unsafe: 'आपातकालीन सहायता मांगी गई है। सुरक्षाकर्मी आ रहे हैं। कृपया जहाँ हैं वहीं रहें।',
    exit: 'आपके लिए सबसे सुरक्षित रास्ता खोजा जा रहा है।',
    gate4: 'गेट 4 पर भीड़ है। कृपया गेट 5 का उपयोग करें। सुरक्षाकर्मी आपकी सहायता करेंगे।',
    sos: 'मदद मांगी गई है। सुरक्षाकर्मी आ रहे हैं। कृपया जहाँ हैं वहीं रहें।',
    fallback: 'SafeFlow आपकी सहायता के लिए यहाँ है। सुरक्षित निकास या आपातकालीन सहायता के लिए बोलें।',
  }
};
