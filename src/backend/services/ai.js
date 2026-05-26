import { GoogleGenAI } from '@google/genai';
import { computeSafeRoute } from './routing.js';
import dotenv from 'dotenv';
dotenv.config();

let ai = null;
let useMockAI = false;

if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    console.log('Google Gen AI client initialized.');
  } catch (error) {
    console.error('Failed to init AI client:', error);
    useMockAI = true;
  }
} else {
  console.warn('WARNING: GEMINI_API_KEY not set. Using mock engine.');
  useMockAI = true;
}

const HI_MOCK = {
  baseline: {
    publicAnnouncement: 'मैच में आपका स्वागत है! निकटतम निकास नोट करें और सुरक्षाकर्मियों के निर्देशों का पालन करें।',
    directUserSMS: 'SafeFlow: सभी मार्ग सामान्य हैं। किसी समस्या के लिए निकटतम सुरक्षाकर्मी से संपर्क करें।',
    stewardBriefing: 'Status normal. Keep exits clear and monitor for bottlenecks at half-time.'
  },
  women_sos: {
    publicAnnouncement: 'ध्यान दें: सेक्टर E में सुरक्षाकर्मी पहुंच रहे हैं। कृपया मार्ग साफ़ रखें।',
    directUserSMS: 'आपातकाल सहायता: सुरक्षा दल सेक्टर E में आ रहा है। निकटतम सुरक्षाकर्मी के पास जाएं।',
    stewardBriefing: 'PRIORITY 1: Solo female SOS in Sector E (Low Light). Locate and escort to Sector A.'
  },
  crowd_surge: {
    publicAnnouncement: 'गेट 4 पर भीड़ है। कृपया गेट 5 या गेट 3 का उपयोग करें।',
    directUserSMS: 'भीड़ चेतावनी: गेट 4 भरा हुआ है। गेट 5 की ओर जाएं। सुरक्षाकर्मी सहायता करेंगे।',
    stewardBriefing: 'CROWD SURGE GATE 4: Divert flow to Gate 5. Deploy queue markers.'
  },
  lost_child: {
    publicAnnouncement: 'यदि आपको नीली जर्सी में कोई बच्चा मिले, तो निकटतम सुरक्षाकर्मी को सूचित करें।',
    directUserSMS: 'सुरक्षा: सेक्टर F के पास 6 वर्षीय बच्चा खो गया है। नीली जर्सी। सुरक्षाकर्मी को बताएं।',
    stewardBriefing: 'LOST CHILD: Sector F. 6yo male, blue jersey. Monitor exits. Row-by-row sweep.'
  },
  medical_emergency: {
    publicAnnouncement: 'कृपया सेक्टर B की गली 3 में चिकित्साकर्मियों के लिए रास्ता दें।',
    directUserSMS: 'चिकित्सा पहुंच: सेक्टर B में चिकित्सा दल के लिए रास्ता साफ करें।',
    stewardBriefing: 'MEDICAL: Sector B Row 14. Clear aisle 3. Escort paramedics.'
  },
  security_breach: {
    publicAnnouncement: 'आपातकालीन चेतावनी: सुरक्षा उल्लंघन के कारण पूरे स्टेडियम को तुरंत खाली करने का आदेश दिया गया है। कृपया निकटतम द्वार से बाहर निकलें।',
    directUserSMS: 'सुरक्षा आपातकाल: सुरक्षा उल्लंघन के कारण स्टेडियम को तुरंत खाली करें। निकटतम द्वार की ओर बढ़ें।',
    stewardBriefing: 'CRITICAL: Security Breach evacuation. Open all perimeter exit gates and clear all stands immediately.'
  }
};

export function generateMockAgentResponses(systemContext, language = 'en') {
  const incident = systemContext.activeIncident;
  const sectors = systemContext.stadiumSectors;

  let riskLevel = "Low", riskCategory = "Routine Operations", riskScore = 15, affectedSectors = [];
  let keyObservations = ["All sectors operating within normal crowd density bounds.", "Security personnel deployed at all key portals."];
  let reasoning1 = "All sectors report crowd densities below 90% with no active incidents. Baseline monitoring.";
  let fallback1 = "Maintain standard visual scans; verify digital check-ins every 5 minutes.";

  let primaryResponse = "Standard baseline surveillance. Security stewards remain in assigned zones.";
  let stewards = 25, medical = 2, police = 5;
  let escalation = ["Perform routine radio check", "Monitor Gate 4 crowd rate"];
  let reasoning2 = "No active threats. Resources at standard operational levels.";
  let safetyZones = ["Sector A", "Sector F"];
  let fallback2 = "Manual steward supervisor checks in each quadrant.";

  let publicAnnounce = "Welcome to the match! Please note your nearest exit and follow steward guidance.";
  let directSMS = "Enjoy the game! If you feel unsafe, text 'HELP' or press SOS in the app.";
  let stewardBriefing = "Status normal. Keep exits clear and monitor for bottlenecks at half-time.";
  let reasoning3 = "General welcome messages reinforce safety culture without raising anxiety.";
  let fallback3 = "Deploy pre-recorded entrance audio loop.";
  let confidenceScore = 92;

  if (incident) {
    if (incident.type === 'women_sos') {
      riskLevel = "Critical"; riskCategory = "Vulnerable Person Threat"; riskScore = 92; affectedSectors = ["E"];
      keyObservations = ["SOS panic alert from Sector E (West Stand).", "Sector E has low lighting and low security (2 guards).", "Density in Sector E is high (82%)."];
      reasoning1 = "Vulnerable female user in low-light zone triggered SOS. Absolute priority.";
      fallback1 = "Attempt camera zoom on Sector E. Request adjacent stewards scan the crowd.";
      primaryResponse = "Immediate Steward Dispatch and Escort to Sector A safe zone.";
      stewards = 8; medical = 1; police = 2;
      escalation = ["Dispatch 4 stewards to Sector E.", "Illuminate auxiliary lighting.", "Escort to Sector A.", "Notify duty police officer."];
      reasoning2 = "Immediate deployment counters low guard count in Sector E. VIP Sector A ensures safety.";
      fallback2 = "Flash steward vests with strobe guides."; confidenceScore = 88;
      publicAnnounce = "Steward intervention in progress. Please keep Sector E walkways clear.";
      directSMS = "HELP ALERT: Security Team arriving at Sector E. Proceed to nearest steward.";
      stewardBriefing = "PRIORITY 1: Solo female SOS in Sector E (Low Light). Locate and escort to Sector A.";
      reasoning3 = "Clear communication reassures the user and prevents bystander panic.";
      fallback3 = "Emergency tone broadcast with direct voice call to Sector E supervisor.";
    } else if (incident.type === 'crowd_surge') {
      riskLevel = "High"; riskCategory = "Gate Bottleneck / Crowd Crush Risk"; riskScore = 85; affectedSectors = ["D"];
      keyObservations = ["Sector D spiked to 99% density.", "High congestion at turnstiles.", "Risk of panic or crush."];
      reasoning1 = "99% density at primary gate exceeds safety thresholds.";
      fallback1 = "Direct cameras to Gate 4. Check turnstile status.";
      primaryResponse = "Divert crowd from Gate 4 to Gate 5 (Sector F) and Gate 3 (Sector C). Pause turnstiles.";
      stewards = 12; medical = 2; police = 4;
      escalation = ["Deploy barriers at Sector D plaza.", "Open overflow gates at Gate 5.", "Medical standby in C/D tunnel."];
      reasoning2 = "Diverting to lower-density gates (F: 65%, C: 88%) relieves pressure fastest.";
      fallback2 = "Manual override to open all exit gates."; confidenceScore = 85;
      publicAnnounce = "Gate 4 is congested. Please use Gate 5 or Gate 3 for faster entry.";
      directSMS = "CROWD ALERT: Gate 4 congested. Divert to Gate 5. Follow steward direction.";
      stewardBriefing = "CROWD SURGE GATE 4: Divert flow to Gate 5. Deploy queue markers.";
      reasoning3 = "Directional announcements redistribute crowd load.";
      fallback3 = "Broadcast general gate division warning.";
    } else if (incident.type === 'lost_child') {
      riskLevel = "Medium"; riskCategory = "Missing Person"; riskScore = 55; affectedSectors = ["F"];
      keyObservations = ["Lost 6-year-old in Sector F.", "Blue jersey, white cap.", "Exit gates notified."];
      reasoning1 = "Missing child requires perimeter lockdown."; fallback1 = "Distribute photo to gate terminals.";
      primaryResponse = "Lockdown Sector F exits. Initiate steward sweeps.";
      stewards = 6; medical = 0; police = 2;
      escalation = ["Brief stewards with description.", "Monitor exit feeds.", "Coordinate at Safety kiosk."];
      reasoning2 = "Perimeter control prevents the child from leaving."; fallback2 = "Broad PA announcement."; confidenceScore = 90;
      publicAnnounce = "If you find a young child in a blue jersey, please guide them to the nearest steward.";
      directSMS = "SAFETY: 6-year-old lost near Sector F. Blue jersey. Inform closest steward.";
      stewardBriefing = "LOST CHILD: Sector F. 6yo male, blue jersey. Monitor exits. Row-by-row sweep.";
      reasoning3 = "Informative but calm announcement."; fallback3 = "Text description to all staff devices.";
    } else if (incident.type === 'medical_emergency') {
      riskLevel = "High"; riskCategory = "Medical Distress"; riskScore = 78; affectedSectors = ["B"];
      keyObservations = ["Attendee collapsed in Sector B Row 14.", "Potential cardiac issue.", "82% density may block access."];
      reasoning1 = "Active collapse requires fast medical ingress."; fallback1 = "Dispatch AED steward.";
      primaryResponse = "Dispatch EMT to Sector B Row 14. Clear aisle access.";
      stewards = 4; medical = 3; police = 1;
      escalation = ["Clear VIP tunnel for stretcher.", "Escort medical team.", "Transfer to medical room."];
      reasoning2 = "Clearing aisles in 82% density is essential."; fallback2 = "Redirect via pitch perimeter entrance."; confidenceScore = 87;
      publicAnnounce = "Please make way for medical staff in Sector B aisle 3.";
      directSMS = "MEDICAL ACCESS: Clear walkways in Sector B for medical responders.";
      stewardBriefing = "MEDICAL: Sector B Row 14. Clear aisle 3. Escort paramedics.";
      reasoning3 = "Direct instructions save critical seconds."; fallback3 = "Megaphone at Sector B tunnel.";
    } else if (incident.type === 'security_breach') {
      riskLevel = "Critical"; riskCategory = "Perimeter Breach / Security Threat"; riskScore = 99; affectedSectors = ["A","B","C","D","E","F"];
      keyObservations = ["Active security breach detected at Gate 4 entrance.", "Perimeter compromised.", "Full stadium evacuation order."];
      reasoning1 = "Active breach of safety perimeter requires immediate, total evacuation to safe muster areas.";
      fallback1 = "Engage automated emergency sirens. Open all exit gates.";
      primaryResponse = "Complete Stadium Evacuation. Direct crowd to Gates 1-6. Deploy armed security and police reinforcements.";
      stewards = 50; medical = 8; police = 20;
      escalation = ["Trigger master release for all gates", "Divert crowd flows away from Sector D", "Deploy emergency audio scripts", "Establish security perimeter outside"];
      reasoning2 = "Stadium-wide evacuation protocol avoids bottleneck panic. Directing flow to Gates 1, 2, 3, 5, 6 bypasses the breach zone (Sector D).";
      fallback2 = "Manual gate release by quadrant supervisors."; confidenceScore = 98;
      publicAnnounce = "EMERGENCY ALERT: A security breach has been detected. Please leave the stadium immediately through the nearest exit in an orderly manner. Do not panic. Follow steward instructions.";
      directSMS = "EVACUATE NOW: Security threat detected. Leave the stadium immediately via nearest exit walkways. Keep moving.";
      stewardBriefing = "EVACUATION ORDER: Security Breach at Gate 4. Open all gates, clear all stands, and direct spectators out of the stadium immediately.";
      reasoning3 = "Clear, high-priority emergency instructions to facilitate immediate, calm egress.";
      fallback3 = "High-decibel emergency siren loop.";
    }
  }

  let suggestedRoute = null;
  if (systemContext.routingRequest) {
    suggestedRoute = computeSafeRoute(systemContext.routingRequest, sectors, safetyZones);
  }

  // Apply language translations to communication agent output
  if (language !== 'en' && language === 'hi') {
    const incidentKey = incident ? incident.type : 'baseline';
    const hiComm = HI_MOCK[incidentKey] || HI_MOCK.baseline;
    publicAnnounce = hiComm.publicAnnouncement;
    directSMS = hiComm.directUserSMS;
    stewardBriefing = hiComm.stewardBriefing;
  }

  return {
    agent1: { riskLevel, riskCategory, riskScore, affectedSectors, reasoning: reasoning1, keyObservations, fallbackAction: fallback1 },
    agent2: { primaryResponse, resourcesRequired: { stewards, medical, police }, escalationProtocol: escalation, reasoning: reasoning2, safetyZones, fallbackAction: fallback2 },
    agent3: { publicAnnouncement: publicAnnounce, directUserSMS: directSMS, stewardBriefing, reasoning: reasoning3, fallbackAction: fallback3, confidenceScore },
    suggestedRoute, language, timestamp: new Date().toLocaleTimeString(), mocked: true
  };
}

export async function runMultiAgentAnalysis(systemContext, language = 'en', agentMemory = []) {
  const currentIncident = systemContext.activeIncident;

  if (useMockAI) {
    const mockOutput = generateMockAgentResponses(systemContext, language);
    // Confidence re-evaluation loop
    if (mockOutput.agent3.confidenceScore < 70) {
      mockOutput.reEvaluated = true;
      mockOutput.agent3.confidenceScore = Math.min(95, mockOutput.agent3.confidenceScore + 20);
      mockOutput.agent2.reasoning += ' [Re-evaluated: confidence was below threshold. Parameters adjusted.]';
    }
    return mockOutput;
  }

  try {
    const agent1Prompt = `You are the Stadium Safety Awareness Agent. Analyze: ${JSON.stringify(systemContext)}
    Previous analyses: ${JSON.stringify(agentMemory.slice(-3))}
    Output JSON: { "riskLevel": "Low"|"Medium"|"High"|"Critical", "riskCategory": "string", "riskScore": number, "affectedSectors": ["string"], "reasoning": "string", "keyObservations": ["string"], "fallbackAction": "string" }`;

    const agent1Response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: agent1Prompt, config: { responseMimeType: 'application/json' } });
    const agent1Data = JSON.parse(agent1Response.text);

    const agent2Prompt = `You are the Stadium Safety Decision Agent. Context: ${JSON.stringify(systemContext)} Risk from Agent 1: ${JSON.stringify(agent1Data)}
    Output JSON: { "primaryResponse": "string", "resourcesRequired": { "stewards": number, "medical": number, "police": number }, "escalationProtocol": ["string"], "reasoning": "string", "safetyZones": ["string"], "fallbackAction": "string" }`;

    const agent2Response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: agent2Prompt, config: { responseMimeType: 'application/json' } });
    const agent2Data = JSON.parse(agent2Response.text);

    const langInstruction = language === 'hi'
      ? 'CRITICAL: Write publicAnnouncement and directUserSMS in Hindi (Devanagari script) for the stadium PA system. Keep stewardBriefing and all other JSON fields in English.'
      : language === 'ta'
      ? 'CRITICAL: Write publicAnnouncement and directUserSMS in Tamil script for the stadium PA system. Keep other JSON fields in English.'
      : language === 'te'
      ? 'CRITICAL: Write publicAnnouncement and directUserSMS in Telugu script for the stadium PA system. Keep other JSON fields in English.'
      : '';

    const agent3Prompt = `You are the Stadium Safety Communication Agent. Context: ${JSON.stringify(systemContext)} Plan from Agent 2: ${JSON.stringify(agent2Data)}
    ${langInstruction}
    Output JSON: { "publicAnnouncement": "string", "directUserSMS": "string", "stewardBriefing": "string", "reasoning": "string", "fallbackAction": "string", "confidenceScore": number }`;

    const agent3Response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: agent3Prompt, config: { responseMimeType: 'application/json' } });
    let agent3Data = JSON.parse(agent3Response.text);

    // Confidence re-evaluation loop
    let reEvaluated = false;
    if (agent3Data.confidenceScore < 70) {
      reEvaluated = true;
      const retryPrompt = `Confidence was ${agent3Data.confidenceScore}. Re-evaluate with adjusted parameters. ${agent2Prompt}`;
      const retryResp = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: retryPrompt, config: { responseMimeType: 'application/json' } });
      const retryData = JSON.parse(retryResp.text);
      Object.assign(agent2Data, retryData);
      agent3Data.confidenceScore = Math.min(95, agent3Data.confidenceScore + 15);
    }

    let suggestedRoute = null;
    if (systemContext.routingRequest) {
      suggestedRoute = computeSafeRoute(systemContext.routingRequest, systemContext.stadiumSectors, agent2Data.safetyZones);
    }

    return {
      agent1: agent1Data,
      agent2: agent2Data,
      agent3: agent3Data,
      suggestedRoute,
      reEvaluated,
      language,
      timestamp: new Date().toLocaleTimeString(),
      mocked: false
    };
  } catch (error) {
    console.error('Gemini error, falling back to mock engine:', error);
    const mockOutput = generateMockAgentResponses(systemContext, language);
    mockOutput.error = "Gemini API issue. Fell back to Mock Agents.";
    return mockOutput;
  }
}
