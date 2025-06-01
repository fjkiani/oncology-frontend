import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
// import { useActivity } from '../context/ActivityContext'; // We will use this later for activity feed
// Placeholder for icons, if we decide to use them
// import { SearchIcon, UserGroupIcon, TableIcon, ViewGridIcon } from '@heroicons/react/outline';

console.log('[DoctorDashboard] VITE_API_ROOT:', import.meta.env.VITE_API_ROOT);
const API_BASE_URL = import.meta.env.VITE_API_ROOT;

const DoctorDashboard = () => {
  // const { activities } = useActivity(); // For later use
  const doctorName = "Dr. Nayeem"; // Placeholder, can be dynamic later

  const [recentPatients, setRecentPatients] = useState([
    { id: "PAT12345", name: "John Doe", lastAccess: "Today" },
    { id: "PAT67890", name: "Jane Smith", lastAccess: "Yesterday" },
    { id: "PAT12344", name: "Robert Johnson", lastAccess: "2 days ago" },
  ]);
  const [tasks, setTasks] = useState([]);
  const [agentActivity, setAgentActivity] = useState([]);
  const [allFetchedTasks, setAllFetchedTasks] = useState([]);

  // Hardcoded recent consultation example
  const recentConsultation = {
    id: "CONSULT001",
    patientId: "PAT67890",
    patientName: "Jane Smith",
    consultantName: "Dr. Evelyn Reed",
    specialty: "Cardiology",
    reason: "Review ECG findings and discuss management of newly diagnosed atrial fibrillation.",
    lastActivity: "Yesterday, 3:45 PM",
    status: "Awaiting your review", // or "Response received", "Pending input"
    summaryOfDiscussion: "Dr. Reed recommended starting an anticoagulant and a beta-blocker. Advised follow-up in 1 month.",
    yourLastMessage: "Thanks, Dr. Reed. I will follow up with the patient regarding these recommendations."
  };

  // Define the hardcoded topics for the Patient Spotlight section
  const SPOTLIGHT_TOPICS_HARDCODED = [
    {
      topic: "Patient's Primary Diagnosis and Staging Details",
      elaboration: "The patient's primary diagnosis is stage IV metastatic melanoma, diagnosed on October 5, 2022.  The histology is classified as malignant melanoma, not otherwise specified. Staging confirmed involvement of cutaneous, hepatic, and pulmonary sites. Initial molecular testing revealed a BRAF V600E mutation."
    },
    {
      topic: "Key Comorbidities and Their Current Management",
      elaboration: "This patient presents with stage IV metastatic melanoma with cutaneous, hepatic, and pulmonary involvement.  A significant comorbidity is the presence of type II diabetes mellitus, managed with metformin 1000mg BID and lifestyle modifications. They also have hypertension, controlled with lisinopril 10mg daily. No known autoimmune history. ECOG performance status is 1."
    },
    {
      topic: "Recent Significant Lab Results and Trends (e.g. Creatinine, Hemoglobin, ANC, Platelets, Liver Enzymes)",
      elaboration: "The provided data lacks specific lab results, making a detailed elaboration on recent trends in creatinine, hemoglobin, ANC, platelets, and liver enzymes not possible at this time. Access to the full EHR lab module would be required for this analysis. It is noted that baseline liver function was within normal limits prior to therapy initiation according to clinical notes."
    }
  ];

  // Fetch Kanban Tasks
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/tasks`);
        if (!response.ok) throw new Error('Failed to fetch tasks');
        const data = await response.json();
        // Filter for tasks in the 'followUpNeeded' column for the preview
        const followUpTasks = data.filter(task => task.columnId === 'followUpNeeded');
        setTasks(followUpTasks.slice(0, 3)); // Show top 3 follow-up tasks
      } catch (error) {
        console.error("Error fetching tasks:", error);
        setTasks([]); // Set to empty array on error
      }
    };
    fetchTasks();
  }, []);

  // Fetch Agent Activity
  useEffect(() => {
    const fetchAgentActivity = async () => {
      console.log("[DoctorDashboard] Fetching agent activity...");
      try {
        const response = await fetch(`${API_BASE_URL}/api/agent_activity`);
        if (!response.ok) {
          console.error("Fetch agent activity failed with status:", response.status);
          throw new Error('Failed to fetch agent activity');
        }
        const data = await response.json();
        console.log("[DoctorDashboard] Raw data from /api/agent_activity:", JSON.stringify(data, null, 2));

        const allAgentsArray = Object.values(data);
        console.log("[DoctorDashboard] All agents array (from Object.values):", JSON.stringify(allAgentsArray, null, 2));

        const filteredAgents = allAgentsArray.filter(agent => {
          const isNotIdle = agent.status && agent.status.toLowerCase() !== 'idle'; // Case-insensitive check
          const hasTimestamp = !!agent.lastActivityTimestamp;
          // console.log(`[AgentFilterDebug] Agent: ${agent.name}, Status: ${agent.status}, IsNotIdle: ${isNotIdle}, HasTimestamp: ${hasTimestamp}`);
          return isNotIdle && hasTimestamp;
        });
        console.log("[DoctorDashboard] Filtered (non-idle, with timestamp) agents:", JSON.stringify(filteredAgents, null, 2));

        const sortedAgents = filteredAgents.sort((a, b) => new Date(b.lastActivityTimestamp) - new Date(a.lastActivityTimestamp));
        console.log("[DoctorDashboard] Sorted active agents:", JSON.stringify(sortedAgents, null, 2));

        const finalAgentList = sortedAgents.slice(0, 3);
        console.log("[DoctorDashboard] Final agent list for display (top 3):", JSON.stringify(finalAgentList, null, 2));
        
        setAgentActivity(finalAgentList); 
      } catch (error) {
        console.error("Error fetching or processing agent activity:", error);
        setAgentActivity([]);
      }
    };
    fetchAgentActivity();
  }, []);

  const workloadStats = {
    awaitingReview: allFetchedTasks.filter(task => task.status === 'Todo' || task.status === 'Awaiting Review').length || 0,
    activeCases: allFetchedTasks.filter(task => task.status === 'In Progress').length || 0,
  };

  // const recentInsights = activities.slice(0, 3); // Example for later
  const placeholderInsights = [
    { id: 1, summary: "Genomic Profile Analyzed for PAT12345", patientId: "PAT12345", type: "Genomic Analysis" },
    { id: 2, summary: "Deep Dive Summary Generated for PAT67890", patientId: "PAT67890", type: "Deep Dive Summary" },
    { id: 3, summary: "Clinical Trial Eligibility Checked for PAT12344", patientId: "PAT12344", type: "Trial Check" },
  ];

  // Static Pathogenic Mutation Example
  const pathogenicMutationExample = {
    gene: "BRAF",
    variant: "BRAF:p.V600E",
    classification: "PATHOGENIC_BY_RULE",
    consequence: "missense_variant",
    predictedScores: [
      "SIFT: deleterious (mock)",
      "PolyPhen: probably_damaging (mock)"
    ],
    knowledgeBases: [
      "ClinVar: Pathogenic (mock)",
      "OncoKB: Level 1 (mock)"
    ],
    evo2Prediction: "Likely pathogenic (mock Evo2)",
    deltaScore: -0.003198,
    evo2Confidence: 0.79,
    reasoning: "BRAF V600E is a well-known activating mutation targeted by multiple therapies.",
    patientId: "PAT12345" // Example patient link for the snippet
  };

  // Hardcoded CRISPR Recommendation Example
  const crisprRecommendation = {
    target: "BRAF (V600E (c.1799T>A))",
    approach: "Utilize an Adenine Base Editor (ABE) to directly revert the pathogenic c.1799T>A mutation to the wild-type sequence (c.1799T). This is a conceptual recommendation based on mock data.",
    rationale: "BRAF V600E is a well-characterized oncogenic driver. Direct correction via base editing is feasible and offers a precise therapeutic strategy, potentially minimizing off-target indels compared to nuclease-based HDR.",
    confidence: "90%",
    source: "GenomicAnalystAgent_MockRec_v0.1",
    patientId: "PAT12345" // Assuming this recommendation is for PAT12345
  };

  // Hardcoded Clinical Trials Example
  const clinicalTrialsData = {
    patientId: "PAT12344",
    totalMatches: 10,
    trials: [
      {
        id: "NCT02655822",
        title: "Phase 1/1b Study to Evaluate the Safety and Tolerability of Ciforadenant Alone and in Combination With Atezolizumab in Advanced Cancers",
        status: "complete",
        phase: "Phase I",
        eligibility: "Likely Ineligible",
        eligibilityColor: "text-red-600 bg-red-100 border-red-300"
      },
      {
        id: "NCT02693535",
        title: "TAPUR: Testing the Use of Food and Drug Administration (FDA) Approved Drugs That Target a Specific Abnormality in a Tumor Gene in People With Advanced Stage Cancer",
        status: "active",
        phase: "Phase II",
        eligibility: "Eligibility Unclear due to missing info",
        eligibilityColor: "text-yellow-600 bg-yellow-100 border-yellow-300"
      },
      {
        id: "NCT02717455",
        title: "Testing the Drug, Panobinostat, for Patients with Diffuse Intrinsic Pontine Glioma",
        status: "closed to accrual and intervention",
        phase: "Phase I",
        eligibility: "Likely Ineligible",
        eligibilityColor: "text-red-600 bg-red-100 border-red-300"
      },
      {
        id: "NCT02744092",
        title: "Direct Oral Anticoagulants (DOACs) Versus LMWH +/- Warfarin for VTE in Cancer",
        status: "complete",
        phase: "No phase specified",
        eligibility: "Eligibility Unclear due to missing info",
        eligibilityColor: "text-yellow-600 bg-yellow-100 border-yellow-300"
      }
    ]
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).format(date);
    } catch (error) {
      return dateString;
    }
  };

  console.log("[DoctorDashboard] Rendering with agentActivity state:", JSON.stringify(agentActivity, null, 2));

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Welcome back, {doctorName}!</h1>
          <p className="text-gray-600">Today is {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.</p>
        </div>

        {/* Main 3-Column Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Left Column */}
          <div className="lg:col-span-1 space-y-6">
            {/* At a Glance Card */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">At a Glance</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Patients Awaiting Review (Kanban)</p>
                  <p className="text-2xl font-bold text-indigo-600">{workloadStats.awaitingReview}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Your Active Cases (Kanban)</p>
                  <p className="text-2xl font-bold text-indigo-600">{workloadStats.activeCases}</p>
                </div>
              </div>
            </div>

            {/* Recent Patients Card */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">Recent Patients</h2>
              {recentPatients.length > 0 ? (
                <ul className="space-y-3">
                  {recentPatients.map(patient => (
                    <li key={patient.id} className="flex justify-between items-center">
                      <Link to={`/medical-records/${patient.id}`} className="text-indigo-600 hover:underline">
                        {patient.name} ({patient.id})
                      </Link>
                      <span className="text-sm text-gray-500">{patient.lastAccess}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No recent patients.</p>
              )}
            </div>
          </div>

          {/* Center Column */}
          <div className="lg:col-span-1 space-y-6">
            {/* Workload Highlights Card */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold text-gray-700 mb-3">Workload Highights (Kanban)</h2>
              {tasks.length > 0 ? (
                <div className="space-y-3">
                  {tasks.map(task => (
                    <div key={task.id} className={`p-3 rounded-md border-l-4 border-blue-500 bg-blue-50`}>
                      <Link to={`/medical-records/${task.patientId}/tasks#task-${task.id}`} className="font-medium text-gray-800 hover:underline block truncate" title={task.content}>{task.content || task.title}</Link>
                      {task.patientId && 
                        <p className="text-xs text-gray-600">Patient: <Link to={`/medical-records/${task.patientId}`} className="text-indigo-600 hover:underline">{task.patientName || task.patientId}</Link></p>
                      }
                      <p className="text-xs text-gray-500">Status: {task.columnId === 'followUpNeeded' ? 'Follow-up Needed' : task.columnId} {task.dueDate ? `| Due: ${formatDate(task.dueDate)}` : ''}</p>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-gray-500">No tasks currently needing follow-up.</p>}
              <div className="mt-4 text-right">
                <Link to="/workload-dashboard" className="text-sm text-indigo-600 hover:underline font-medium">View Full Kanban &rarr;</Link>
              </div>
            </div>

            {/* Active AI Agents Card */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold text-gray-700 mb-3">Active AI Agents</h2>
              {agentActivity.length > 0 ? (
                <ul className="space-y-3">
                  {agentActivity.map(agent => (
                    <li key={agent.id} className="p-3 bg-gray-50 rounded-md border border-gray-200">
                      <h3 className="text-sm font-semibold text-teal-700">{agent.name}</h3>
                      <p className="text-xs text-gray-600 truncate" title={agent.status}>Status: {agent.status}</p>
                      {agent.lastActionSummary && <p className="text-xs text-gray-500 mt-0.5 truncate" title={agent.lastActionSummary}>Last: {agent.lastActionSummary}</p>}
                      {agent.lastPatientId && <p className="text-xs text-gray-500">Patient: <Link to={`/medical-records/${agent.lastPatientId}`} className="text-indigo-500 hover:underline">{agent.lastPatientId}</Link></p>}
                      <p className="text-xs text-gray-400">Updated: {formatDate(agent.lastActivityTimestamp)}</p>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-gray-500">No agents currently active.</p>}
              <div className="mt-4 text-right">
                <Link to="/agent-dashboard" className="text-sm text-indigo-600 hover:underline font-medium">View Agent Dashboard &rarr;</Link>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-1 space-y-6">
            {/* Pathogenic Mutation Highlight Card */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold text-gray-700 mb-3">Pathogenic Mutation Highlight</h2>
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs">
                <p className="font-bold text-red-700 text-sm mb-1">{pathogenicMutationExample.gene}: {pathogenicMutationExample.variant.split(':')[1]}</p>
                <p><strong>Patient:</strong> <Link to={`/medical-records/${pathogenicMutationExample.patientId}`} className="text-indigo-600 hover:underline">{pathogenicMutationExample.patientId}</Link></p>
                <p><strong>Classification:</strong> <span className="font-medium">{pathogenicMutationExample.classification}</span></p>
                <p><strong>Consequence:</strong> {pathogenicMutationExample.consequence}</p>
                <div className="mt-1">
                  <strong>Predicted Scores:</strong>
                  <ul className="list-disc list-inside pl-4">
                    {pathogenicMutationExample.predictedScores.map((score, i) => <li key={i}>{score}</li>)}
                  </ul>
                </div>
                <div className="mt-1">
                  <strong>Knowledge Bases:</strong>
                  <ul className="list-disc list-inside pl-4">
                    {pathogenicMutationExample.knowledgeBases.map((kb, i) => <li key={i}>{kb}</li>)}
                  </ul>
                </div>
                <p className="mt-1"><strong>Evo2 Prediction:</strong> <span className="font-medium">{pathogenicMutationExample.evo2Prediction}</span></p>
                <p><strong>Delta Score:</strong> {pathogenicMutationExample.deltaScore.toFixed(6)}</p>
                <p><strong>Evo2 Confidence:</strong> {(pathogenicMutationExample.evo2Confidence * 100).toFixed(0)}%</p>
                <p className="mt-1 italic text-gray-600"><strong>Reasoning:</strong> {pathogenicMutationExample.reasoning}</p>
              </div>
              <div className="mt-4 text-right">
                <Link to={`/mutation-explorer/${pathogenicMutationExample.patientId}`} className="text-sm text-indigo-600 hover:underline font-medium">Explore Mutations for {pathogenicMutationExample.patientId} &rarr;</Link>
              </div>
            </div>

            {/* More Tools Card */}
            <div className="bg-white p-6 rounded-lg shadow h-full flex flex-col">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">More Tools</h2>
              <div>
                <div className="space-y-3">
                  <Link to="/medical-records" className="block w-full p-3 bg-gray-200 text-indigo-700 rounded-md shadow hover:bg-gray-300 transition-colors text-center font-medium">
                      Search Patient Records
                  </Link>
                  <Link to="/mutation-explorer" className="block w-full p-3 bg-purple-500 text-white rounded-md shadow hover:bg-purple-600 transition-colors text-center font-medium">
                      Global Mutation Explorer
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Focused Insights Row (Consultation, CRISPR, Trials) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Recent Consultation Snippet Card */}
          {recentConsultation && (
            <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow h-full flex flex-col">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xl font-semibold text-gray-700">Recent Consultation</h2>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${recentConsultation.status === 'Awaiting your review' ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'}`}>
                  {recentConsultation.status}
                </span>
              </div>
              <div className="text-sm space-y-2 flex-grow">
                <p>
                  <span className="font-medium text-gray-600">Patient:</span> 
                  <Link to={`/medical-records/${recentConsultation.patientId}`} className="text-indigo-600 hover:underline ml-1">
                    {recentConsultation.patientName} ({recentConsultation.patientId})
                  </Link>
                </p>
                <p>
                  <span className="font-medium text-gray-600">Consultant:</span> Dr. {recentConsultation.consultantName} ({recentConsultation.specialty})
                </p>
                <p>
                  <span className="font-medium text-gray-600">Reason:</span> {recentConsultation.reason}
                </p>
                <div className="p-2.5 bg-gray-50 rounded-md mt-2">
                  <p className="text-xs text-gray-500 mb-0.5">Summary of Discussion:</p>
                  <p className="italic text-gray-700 text-xs">{recentConsultation.summaryOfDiscussion}</p>
                </div>
                {recentConsultation.yourLastMessage && 
                  <div className="p-2.5 bg-indigo-50 rounded-md mt-1">
                    <p className="text-xs text-indigo-500 mb-0.5">Your Last Input:</p>
                    <p className="italic text-indigo-700 text-xs">{recentConsultation.yourLastMessage}</p>
                  </div>
                }
              </div>
              <p className="text-xs text-gray-400 mt-2 text-right self-end">Last activity: {recentConsultation.lastActivity}</p>
              <div className="mt-4 text-right">
                <Link to={`/consultations/${recentConsultation.id}`} className="text-sm text-indigo-600 hover:underline font-medium">View Full Consultation &rarr;</Link>
              </div>
            </div>
          )}

          {/* CRISPR Therapeutic Recommendations Card */}
          {crisprRecommendation && (
            <div className="lg:col-span-1 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6 rounded-lg shadow-lg border border-indigo-200 h-full flex flex-col">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xl font-semibold text-indigo-700">CRISPR Recommendations</h2>
              </div>
              <div className="text-sm space-y-3 flex-grow">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500 mr-2 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 2a.75.75 0 01.75.75v1.313c1.357.173 2.654.59 3.836 1.207l.977-.564a.75.75 0 01.976 1.299l-.977.564c.739.89 1.348 1.873 1.794 2.912l1.246-.25a.75.75 0 01.732 1.48l-1.246.25c.205 1.36.037 2.765-.49 4.08l1.11.642a.75.75 0 01-.39 1.398l-1.11-.642c-.69.955-1.525 1.792-2.474 2.477l.642 1.11a.75.75 0 01-1.398.39l-.642-1.11a7.466 7.466 0 01-4.08.49l-.25 1.246a.75.75 0 01-1.48-.732l.25-1.246a7.52 7.52 0 01-2.912-1.794l-.564.977a.75.75 0 01-1.299-.976l.564-.977c-.89-.739-1.873-1.348-2.912-1.794l-.25 1.246a.75.75 0 01-1.48-.732l.25-1.246a7.466 7.466 0 01-.49-4.08l-.642 1.11a.75.75 0 01-1.398-.39l.642-1.11c.955-.69 1.792-1.525 2.477-2.474l-1.11-.642a.75.75 0 01.39-1.398l1.11.642c.446-1.039 1.055-2.022 1.794-2.912l-.977-.564a.75.75 0 01.976-1.299l.977.564A7.46 7.46 0 0110 3.063V2.25A.75.75 0 0110 2zM8.5 7.5a.5.5 0 000 1h3a.5.5 0 000-1h-3zM7 10.5a.5.5 0 01.5-.5h5a.5.5 0 010 1h-5a.5.5 0 01-.5-.5zm.5 2.5a.5.5 0 000 1h3a.5.5 0 000-1h-3z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium text-indigo-600">Target:</span> 
                  <span className="ml-1 text-indigo-800 font-mono text-xs tracking-tight">{crisprRecommendation.target}</span>
                </div>
                <div>
                  <p className="font-medium text-indigo-600 mb-0.5">Approach:</p>
                  <p className="text-indigo-900 bg-indigo-100 p-3 rounded-md text-xs leading-relaxed border border-indigo-200 shadow-sm">{crisprRecommendation.approach}</p>
                </div>
                <div>
                  <p className="font-medium text-indigo-600 mb-0.5">Rationale:</p>
                  <p className="text-indigo-900 bg-indigo-100 p-3 rounded-md text-xs leading-relaxed border border-indigo-200 shadow-sm">{crisprRecommendation.rationale}</p>
                </div>
              </div>
              <div className="flex justify-between items-baseline mt-3 pt-2 border-t border-indigo-200">
                <p>
                  <span className="font-medium text-indigo-600">Confidence:</span> 
                  <span className="font-bold text-teal-600 ml-1 text-lg">{crisprRecommendation.confidence}</span>
                </p>
                <p className="text-xs text-purple-500 font-mono">
                  Source: {crisprRecommendation.source}
                </p>
              </div>
              {crisprRecommendation.patientId && (
                <div className="mt-4 text-right">
                    <Link to={`/medical-records/${crisprRecommendation.patientId}#crispr-research`} className="text-sm text-indigo-600 hover:underline font-medium">View for Patient {crisprRecommendation.patientId} &rarr;</Link>
                </div>
              )}
            </div>
          )}

          {/* Clinical Trials Snippet Card */}
          {clinicalTrialsData && (
            <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow h-full flex flex-col">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xl font-semibold text-gray-700">Matching Clinical Trials ({clinicalTrialsData.totalMatches})</h2>
              </div>
              <div className="space-y-3 flex-grow">
                {clinicalTrialsData.trials.slice(0, 2).map(trial => ( 
                  <div key={trial.id} className="p-3 bg-gray-50 rounded-md border border-gray-200">
                    <h4 className="text-sm font-medium text-gray-800 leading-tight mb-1 truncate" title={trial.title}>{trial.title}</h4>
                    <p className="text-xs text-gray-500 mb-1.5">
                      <span className="font-semibold">NCT ID:</span> {trial.id} | <span className="font-semibold">Status:</span> {trial.status} | <span className="font-semibold">Phase:</span> {trial.phase}
                    </p>
                    <p className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-block border ${trial.eligibilityColor}`}>
                      {trial.eligibility}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-right">
                <Link 
                  to={`/medical-records/${clinicalTrialsData.patientId}/research`} 
                  className="text-sm text-indigo-600 hover:underline font-medium"
                >
                  Explore All Trials for {clinicalTrialsData.patientId} &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Patient Spotlight Card - Full Width Below */}
        <div className="mt-6 bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-700">Patient Spotlight: PAT12345</h2>
            <Link to="/medical-records/PAT12345" className="text-sm text-indigo-600 hover:underline font-medium">
                View Full Record &rarr;
            </Link>
          </div>
          <div>
            <h3 className="text-md font-semibold text-gray-600 mb-1">Holistic Analysis & Deeper Insights:</h3>
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mt-2">
                {SPOTLIGHT_TOPICS_HARDCODED.map(section => {
                const snippet = section.elaboration.length > 150 
                    ? section.elaboration.substring(0, 150) + "..." 
                    : section.elaboration;
                
                return (
                    <div key={section.topic} className="p-3 bg-gray-50 rounded-md border border-gray-200 flex flex-col justify-between">
                    <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-1 truncate" title={section.topic}>{section.topic}</h4>
                        <p className="text-xs text-gray-600 mb-2 leading-relaxed">
                        {snippet}
                        </p>
                    </div>
                    <Link 
                        to={`/medical-records/PAT12345#deep-dive-${section.topic.toLowerCase().replace(/\s+/g, '-')}`} 
                        className="text-xs text-indigo-600 hover:underline font-medium self-start mt-auto"
                    >
                        Read More
                    </Link>
                    </div>
                );
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard; 