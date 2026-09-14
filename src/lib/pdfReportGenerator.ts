import { jsPDF } from 'jspdf';
import { AnalysisResult } from '../types.ts';
import { 
  generatePlayerTrainingReport, 
  generateTacticalPreferences, 
  generateGamePlanRecommendations 
} from './tacticalReportGenerator.ts';

export function exportSquadAnalysisToPdf(analysis: AnalysisResult) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  let y = margin;
  let currentPage = 1;

  // Hydrate missing fields if legacy report
  const training = analysis.playerTrainingReport || generatePlayerTrainingReport(
    analysis.bestXI.players,
    analysis.coachRecommendation?.tacticalStyle || 'Quick Counter'
  );
  const tactics = analysis.tacticalPreferences || generateTacticalPreferences(
    analysis.coachRecommendation?.tacticalStyle || 'Quick Counter',
    analysis.recommendedFormation || '4-2-1-3'
  );
  const gamePlan = analysis.gamePlanRecommendations || generateGamePlanRecommendations(
    analysis.coachRecommendation?.tacticalStyle || 'Quick Counter',
    analysis.recommendedFormation || '4-2-1-3',
    analysis.identifiedPlayers || []
  );

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 18) {
      drawFooter();
      doc.addPage();
      currentPage++;
      y = margin;
      drawHeader();
    }
  };

  const drawHeader = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(16, 185, 129); // Emerald
    doc.text('eFOOTBALL AI HUB  ·  TACTICAL DOSSIER', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(140, 140, 140);
    doc.text(`Doc ID: ${analysis.id.slice(0, 12)}`, pageWidth - margin, y, { align: 'right' });
    y += 3;
    doc.setDrawColor(40, 40, 40);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
  };

  const drawFooter = () => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text('eFootball AI Hub is an independent third-party analysis tool not affiliated with or endorsed by Konami.', margin, pageHeight - 8);
    doc.text(`Page ${currentPage}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  };

  // --- PAGE 1: TITLE & EXECUTIVE SUMMARY ---
  drawHeader();

  // Banner Box
  doc.setFillColor(18, 24, 27);
  doc.roundedRect(margin, y, contentWidth, 26, 3, 3, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  const titleText = doc.splitTextToSize(analysis.title || 'Verified Squad Tactical Analysis', contentWidth - 12);
  doc.text(titleText, margin + 6, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(52, 211, 153); // Emerald 400
  const dateStr = analysis.createdAt ? new Date(analysis.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Verified Analysis';
  doc.text(`Generated: ${dateStr}  ·  Formation: ${analysis.recommendedFormation}  ·  Playstyle: ${analysis.coachRecommendation?.tacticalStyle || 'Tactical'}`, margin + 6, y + 17);

  doc.setFontSize(7.5);
  doc.setTextColor(160, 160, 160);
  doc.text(`Dataset: ${analysis.identifiedPlayers?.length || 0} Player Records  ·  Quality Score: ${analysis.analysisQuality?.score || 92}% (${analysis.analysisQuality?.ratingLabel || 'Verified'})`, margin + 6, y + 22);

  y += 32;

  // Ratings Grid Box
  checkPageBreak(30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('SQUAD RATINGS BREAKDOWN', margin, y);
  y += 4;

  const ratings = analysis.squadRatings || { overall: 86, attack: 88, midfield: 85, defence: 84, goalkeeping: 86, balance: 86, depth: 82, tacticalSuitability: 87 };
  const ratingItems = [
    { label: 'Overall', val: ratings.overall },
    { label: 'Attack', val: ratings.attack },
    { label: 'Midfield', val: ratings.midfield },
    { label: 'Defence', val: ratings.defence },
    { label: 'Goalkeeping', val: ratings.goalkeeping },
    { label: 'Balance', val: ratings.balance },
    { label: 'Depth', val: ratings.depth },
    { label: 'Suitability', val: ratings.tacticalSuitability }
  ];

  const colW = contentWidth / 4;
  const rowH = 10;
  doc.setFillColor(24, 24, 27);
  doc.rect(margin, y, contentWidth, rowH * 2, 'F');
  doc.setDrawColor(45, 45, 50);
  doc.rect(margin, y, contentWidth, rowH * 2, 'S');

  ratingItems.forEach((item, idx) => {
    const r = Math.floor(idx / 4);
    const c = idx % 4;
    const posX = margin + c * colW + 4;
    const posY = y + r * rowH + 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(170, 170, 170);
    doc.text(`${item.label}:`, posX, posY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(52, 211, 153);
    doc.text(`${item.val || 85}`, posX + 24, posY);
  });

  y += rowH * 2 + 8;

  // Best XI Table
  checkPageBreak(50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(`STARTING BEST XI (${analysis.recommendedFormation})`, margin, y);
  y += 4;

  // Table header
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, y, contentWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('POS', margin + 3, y + 4.2);
  doc.text('PLAYER', margin + 18, y + 4.2);
  doc.text('OVR', margin + 70, y + 4.2);
  doc.text('PLAYSTYLE', margin + 85, y + 4.2);
  doc.text('TACTICAL SELECTION REASON', margin + 125, y + 4.2);
  y += 6;

  (analysis.bestXI?.players || []).slice(0, 11).forEach((p, idx) => {
    checkPageBreak(7);
    doc.setFillColor(idx % 2 === 0 ? 18 : 24, idx % 2 === 0 ? 18 : 24, idx % 2 === 0 ? 20 : 27);
    doc.rect(margin, y, contentWidth, 6.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(52, 211, 153);
    doc.text(p.position || 'CMF', margin + 3, y + 4.5);

    doc.setTextColor(255, 255, 255);
    doc.text((p.name || 'Player').slice(0, 26), margin + 18, y + 4.5);

    doc.setTextColor(251, 191, 36); // Amber OVR
    doc.text(String(p.rating || 90), margin + 70, y + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(190, 190, 190);
    doc.text((p.playstyle || 'Standard').slice(0, 18), margin + 85, y + 4.5);

    const reason = doc.splitTextToSize(p.selectionReason || 'Selected based on tactical rating fit.', contentWidth - 128);
    doc.setTextColor(150, 150, 150);
    doc.text(reason[0] || '', margin + 125, y + 4.5);

    y += 6.5;
  });

  y += 6;

  // Strengths & Weaknesses
  checkPageBreak(30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text('TACTICAL STRENGTHS & VULNERABILITIES', margin, y);
  y += 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(52, 211, 153);
  doc.text('Key Strengths:', margin, y);
  y += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(200, 200, 200);
  (analysis.strengths || []).slice(0, 3).forEach((s) => {
    checkPageBreak(5);
    const lines = doc.splitTextToSize(`• ${s}`, contentWidth - 4);
    doc.text(lines, margin + 2, y);
    y += lines.length * 3.5;
  });

  y += 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(244, 63, 94); // Rose
  doc.text('Critical Weaknesses & Exploits:', margin, y);
  y += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(200, 200, 200);
  (analysis.weaknesses || []).slice(0, 3).forEach((w) => {
    checkPageBreak(5);
    const lines = doc.splitTextToSize(`• ${w}`, contentWidth - 4);
    doc.text(lines, margin + 2, y);
    y += lines.length * 3.5;
  });

  y += 6;

  // Individual Instructions (eFootball 2027 Attack 1/2 & Defence 1/2)
  checkPageBreak(35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text('INDIVIDUAL PLAYER INSTRUCTIONS (eFootball 2027)', margin, y);
  y += 4;

  (analysis.individualInstructions || []).slice(0, 4).forEach((inst, idx) => {
    checkPageBreak(11);
    doc.setFillColor(24, 24, 27);
    doc.rect(margin, y, contentWidth, 9.5, 'F');
    doc.setDrawColor(40, 40, 45);
    doc.rect(margin, y, contentWidth, 9.5, 'S');

    const slotLabel = inst.slot || (idx === 0 ? 'Attack 1' : idx === 1 ? 'Attack 2' : idx === 2 ? 'Defence 1' : 'Defence 2');
    const isAttack = slotLabel.includes('Attack');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(isAttack ? 251 : 52, isAttack ? 146 : 211, isAttack ? 60 : 153);
    doc.text(`[${slotLabel}] ${inst.player} (${inst.position}) → ${inst.instruction}`, margin + 3, y + 3.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(180, 180, 180);
    const whyLines = doc.splitTextToSize(inst.why || '', contentWidth - 6);
    doc.text(whyLines[0] || '', margin + 3, y + 7.2);

    y += 11;
  });

  // --- NEW SECTION A: PLAYER TRAINING REPORT ---
  checkPageBreak(40);
  y += 4;
  doc.setFillColor(16, 185, 129, 0.1);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(16, 185, 129);
  doc.text('SECTION A: PLAYER TRAINING REPORT', margin, y);
  y += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(180, 180, 180);
  const trainSummaryLines = doc.splitTextToSize(training.summary, contentWidth);
  doc.text(trainSummaryLines, margin, y);
  y += trainSummaryLines.length * 3.5 + 3;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('Key Players Progression & Point Allocation Advice:', margin, y);
  y += 4;

  training.progressionAllocationAdvice.forEach((adv) => {
    checkPageBreak(20);
    doc.setFillColor(22, 27, 34);
    doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(52, 211, 153);
    doc.text(`${adv.playerName} (${adv.position} · ${adv.rating} OVR)`, margin + 4, y + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(200, 200, 200);
    const pts = adv.recommendedProgression.map(p => `${p.attributeGroup}: +${p.points}`).join('  |  ');
    doc.text(`Points: ${pts}`, margin + 4, y + 8.5);

    doc.setTextColor(160, 160, 160);
    doc.text(`Skills: ${adv.recommendedSkills.join(', ')}`, margin + 4, y + 12);

    doc.setTextColor(130, 130, 130);
    const focusLines = doc.splitTextToSize(`Focus: ${adv.specialTrainingFocus}`, contentWidth - 8);
    doc.text(focusLines[0] || '', margin + 4, y + 15.5);

    y += 20;
  });

  // Position specific tips
  checkPageBreak(25);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('Position-Specific Training Rules:', margin, y);
  y += 4;

  training.positionSpecificTips.forEach((tip) => {
    checkPageBreak(8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(52, 211, 153);
    doc.text(`• ${tip.role}: `, margin + 2, y);

    const titleWidth = doc.getTextWidth(`• ${tip.role}: `);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 180, 180);
    const tipText = doc.splitTextToSize(tip.guidance, contentWidth - titleWidth - 4);
    doc.text(tipText[0] || '', margin + 2 + titleWidth, y);
    y += 4;
  });

  // --- NEW SECTION B: TACTICAL PREFERENCES ---
  checkPageBreak(40);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(56, 189, 248); // Cyan
  doc.text(`SECTION B: TACTICAL PREFERENCES (${tactics.chosenPlaystyle})`, margin, y);
  y += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(180, 180, 180);
  const tacOverview = doc.splitTextToSize(tactics.playstyleOverview, contentWidth);
  doc.text(tacOverview, margin, y);
  y += tacOverview.length * 3.5 + 3;

  // 3 setups: Attacking, Defensive, Transition
  const setups = [
    { title: '1. Attacking Tactical Setup', data: tactics.attackingSetup.details.join('  •  '), extra: `Build-up: ${tactics.attackingSetup.buildUpStyle} | Focus: ${tactics.attackingSetup.positioningFocus}` },
    { title: '2. Defensive Tactical Setup', data: tactics.defensiveSetup.pressuringGuidelines.join('  •  '), extra: `Style: ${tactics.defensiveSetup.defensiveStyle} | Line: ${tactics.defensiveSetup.defensiveLineLevel}` },
    { title: '3. Transition Tactical Setup', data: tactics.transitionSetup.counterPressRules.join('  •  '), extra: `Offence: ${tactics.transitionSetup.offensiveTransition} | Defence: ${tactics.transitionSetup.defensiveTransition}` }
  ];

  setups.forEach((s) => {
    checkPageBreak(16);
    doc.setFillColor(20, 24, 30);
    doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(56, 189, 248);
    doc.text(s.title, margin + 4, y + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(170, 170, 170);
    const extraLines = doc.splitTextToSize(s.extra, contentWidth - 8);
    doc.text(extraLines[0] || '', margin + 4, y + 8);

    doc.setTextColor(140, 140, 140);
    const dataLines = doc.splitTextToSize(`Guidelines: ${s.data}`, contentWidth - 8);
    doc.text(dataLines[0] || '', margin + 4, y + 11.5);

    y += 16;
  });

  // --- NEW SECTION C: GAME PLAN RECOMMENDATIONS ---
  checkPageBreak(40);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(251, 191, 36); // Amber
  doc.text('SECTION C: GAME PLAN RECOMMENDATIONS', margin, y);
  y += 4;

  // Preparation & Arrows
  checkPageBreak(16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('Match-Day Condition Arrows & Set Pieces:', margin, y);
  y += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(180, 180, 180);
  const arrowLines = doc.splitTextToSize(gamePlan.matchDayPreparation.conditionArrowPriorities, contentWidth - 4);
  doc.text(arrowLines, margin + 2, y);
  y += arrowLines.length * 3.2 + 3;

  // Substitutions
  checkPageBreak(22);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('Substitutions Timing Strategy:', margin, y);
  y += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(180, 180, 180);
  const sub1 = doc.splitTextToSize(`• 60th - 65th Min: ${gamePlan.substitutionStrategy.earlySecondHalfSub}`, contentWidth - 4);
  doc.text(sub1, margin + 2, y);
  y += sub1.length * 3.2 + 1;
  const sub2 = doc.splitTextToSize(`• 75th - 80th Min: ${gamePlan.substitutionStrategy.closingStageSub}`, contentWidth - 4);
  doc.text(sub2, margin + 2, y);
  y += sub2.length * 3.2 + 3;

  // In-match adjustments
  checkPageBreak(20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('In-Match Tactical Adjustments:', margin, y);
  y += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(180, 180, 180);
  const adjLead = doc.splitTextToSize(`• Leading Late (80\'+): ${gamePlan.inMatchAdjustments.leadingLate}`, contentWidth - 4);
  doc.text(adjLead, margin + 2, y);
  y += adjLead.length * 3.2 + 1;
  const adjTrail = doc.splitTextToSize(`• Trailing Late (70\'+): ${gamePlan.inMatchAdjustments.trailingLate}`, contentWidth - 4);
  doc.text(adjTrail, margin + 2, y);
  y += adjTrail.length * 3.2 + 1;
  const adjThrough = doc.splitTextToSize(`• Countering Through-Balls: ${gamePlan.inMatchAdjustments.counteringCentralThroughBalls}`, contentWidth - 4);
  doc.text(adjThrough, margin + 2, y);
  y += adjThrough.length * 3.2 + 2;

  // Final footer
  drawFooter();

  // Trigger download
  const cleanTitle = (analysis.title || 'eFootball_Tactical_Report')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 40);
  doc.save(`${cleanTitle}_Report.pdf`);
}
