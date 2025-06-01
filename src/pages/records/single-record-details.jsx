import React, { useState, useEffect, useMemo } from "react";
import {
  IconChevronRight,
  IconFileUpload,
  IconProgress,
} from "@tabler/icons-react";
import {
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { useStateContext } from "../../context/index";
import ReactMarkdown from "react-markdown";
import FileUploadModal from "./components/file-upload-modal";
import RecordDetailsHeader from "./components/record-details-header";
import { GoogleGenerativeAI } from "@google/generative-ai";
import AgentInsightWidget from "../../components/AgentInsightWidget";

// Import the component for displaying structured EHR data + CoPilot prompt
import PatientRecordViewer from "../../components/ehr/PatientRecordViewer";

console.log('VITE_API_ROOT from import.meta.env:', import.meta.env.VITE_API_ROOT);
console.log('All import.meta.env variables:', JSON.stringify(import.meta.env, null, 2));

const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
const API_BASE_URL = import.meta.env.VITE_API_ROOT;

const SingleRecordDetails = () => {
  const { id: patientIdFromUrl } = useParams(); // Changed to destructure 'id' as per route definition
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state; 

  // --- State for Uploaded File Analysis & Kanban ---
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [processingKanban, setIsProcessingKanban] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(state?.analysisResult || ""); // Analysis result from uploaded file
  const [filename, setFilename] = useState("");
  const [filetype, setFileType] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- State for Fetched Patient EHR Data ---
  const [patientData, setPatientData] = useState(null); // Structured EHR data from backend
  const [isLoadingEhr, setIsLoadingEhr] = useState(true); // Loading state for EHR data
  const [ehrError, setEhrError] = useState(null); // Error state for EHR data fetching

  const { updateRecord } = useStateContext(); // Context function (ensure this is available and working)

  // --- File Upload Modal Handlers ---
  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      console.log("Selected file:", selectedFile);
      setFileType(selectedFile.type);
      setFilename(selectedFile.name);
      setFile(selectedFile);
    }
  };

  // --- Base64 Helper ---
  const readFileAsBase64 = (fileToRead) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(fileToRead);
    });
  };

  // --- Gemini Call for Uploaded File Analysis ---
  const handleFileUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadSuccess(false);
    setAnalysisResult(""); // Clear previous analysis

    // Check if API Key is available (consider better error handling)
    if (!geminiApiKey) {
        console.error("Error: VITE_GEMINI_API_KEY is not set in environment variables.");
        setEhrError("Frontend API Key is missing."); // Use ehrError state for general errors?
        setUploading(false);
        return;
    }
    const genAI = new GoogleGenerativeAI(geminiApiKey);

    try {
      const base64Data = await readFileAsBase64(file);
      const imageParts = [{ inlineData: { data: base64Data, mimeType: filetype } }];
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" }); // Ensure correct model
      const prompt = `You are an expert cancer and any disease diagnosis analyst. Use your knowledge base to analyze the provided image/document and give a detailed treatment plan. Make it readable, clear, and easy to understand in paragraphs.`;

      const result = await model.generateContent([prompt, ...imageParts]);
      const response = await result.response;
      const text = response.text();
      setAnalysisResult(text);

      // Update record via context if documentID is available (e.g., from state)
      // The documentID might differ from the patientIdFromUrl
      const documentIdForUpdate = state?.id; // Get ID from navigation state if present
      if (documentIdForUpdate && updateRecord) {
         console.log(`Updating record ${documentIdForUpdate} with analysis result.`);
         await updateRecord({
            documentID: documentIdForUpdate,
            analysisResult: text,
            // kanbanRecords: "", // Reset Kanban? Decide on behavior
         });
      } else {
          console.warn("Cannot update record via context: documentID or updateRecord function missing.");
      }

      setUploadSuccess(true);
      setIsModalOpen(false);
      setFilename("");
      setFile(null);
      setFileType("");
    } catch (error) {
      console.error("Error uploading and analyzing file:", error);
      setUploadSuccess(false);
      // Display error to user?
    } finally {
      setUploading(false);
    }
  };

  // --- Gemini Call for Kanban Generation ---
  const processTreatmentPlan = async () => {
    if (!analysisResult) return;
    setIsProcessingKanban(true);

    if (!geminiApiKey) {
        console.error("Error: VITE_GEMINI_API_KEY is not set.");
        setIsProcessingKanban(false);
        return;
    }
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" }); // Ensure correct model

    const prompt = `Based on the following treatment plan analysis: \n${analysisResult}\n\n Create a Kanban board structure with columns: "Todo", "Work in progress", and "Done". Populate the 'tasks' array with actionable steps derived from the plan, assigning each task an 'id', the appropriate 'columnId' ('todo', 'doing', 'done'), and a concise 'content' description. Respond ONLY with the JSON structure, like this example:
{
  "columns": [
    { "id": "todo", "title": "Todo" },
    { "id": "doing", "title": "Work in progress" },
    { "id": "done", "title": "Done" }
  ],
  "tasks": [
    { "id": "1", "columnId": "todo", "content": "Schedule initial consultation" },
    { "id": "2", "columnId": "todo", "content": "Complete baseline blood tests" },
    { "id": "3", "columnId": "doing", "content": "Undergo first chemotherapy cycle" }
  ]
}
`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        // Basic cleaning attempt for JSON
        const text = response.text().replace(/^`{3}json\s*|`{3}$/g, '').trim();
        console.log("Raw Kanban JSON Text:", text);
        const parsedResponse = JSON.parse(text);
        console.log("Parsed Kanban JSON:", parsedResponse);

        const documentIdForUpdate = state?.id;
        if (documentIdForUpdate && updateRecord) {
            console.log(`Updating record ${documentIdForUpdate} with Kanban data.`);
            await updateRecord({
                documentID: documentIdForUpdate,
                kanbanRecords: text, // Store the raw JSON string
            });
        } else {
             console.warn("Cannot update record via context: documentID or updateRecord function missing.");
        }

        navigate("/screening-schedules", { state: parsedResponse }); // Navigate with parsed data
    } catch(error) {
        console.error("Error processing treatment plan into Kanban:", error);
         // Display error to user?
    } finally {
        setIsProcessingKanban(false);
    }
  };

  // --- Effect for Fetching Patient EHR Data ---
  useEffect(() => {
    const fetchPatientData = async () => {
      if (!patientIdFromUrl) {
        setEhrError("No patient ID specified in the URL.");
        setIsLoadingEhr(false);
        setPatientData(null); 
        return;
      }

      setIsLoadingEhr(true);
      setEhrError(null);
      setPatientData(null); 
      console.log(`Fetching EHR data for patient ID: ${patientIdFromUrl}`);

      try {
        const response = await fetch(`${API_BASE_URL}/api/patients/${patientIdFromUrl}`); // Use environment variable
        if (!response.ok) {
          let errorDetail = `HTTP error! status: ${response.status}`;
          try {
            const errorData = await response.json();
            errorDetail = errorData.detail || errorData.message || errorDetail;
          } catch (e) { 
            // Ignore 
          }
          throw new Error(errorDetail);
        }
        
        const result = await response.json(); 
        console.log("Fetched patient EHR data (raw response):", result);

        if (result.success && result.data) {
          const formattedPatientData = {
            ...result.data,
            patientId: result.data.id
          };
          setPatientData(formattedPatientData); 
          console.log("Processed patient EHR data for PatientRecordViewer:", formattedPatientData);
        } else if (result.error && result.error === "Patient not found") { 
          setPatientData(null);
          throw new Error("Patient EHR data not found for this ID.");
        } else if (!result.success && result.message) {
          setPatientData(null);
          throw new Error(result.message);
        } else { 
          setPatientData(null);
          throw new Error("Patient data not found or response format is invalid.");
        }
      } catch (fetchError) {
        const urlBeingFetched = `${API_BASE_URL}/api/patients/${patientIdFromUrl}`;
        console.error(`Error fetching patient EHR data from ${urlBeingFetched}:`, fetchError);
        let detailedErrorMessage = fetchError.message || "Failed to load patient EHR record.";
        if (fetchError.message && (fetchError.message.toLowerCase().includes("unexpected token") || fetchError.message.toLowerCase().includes("not valid json"))) {
            detailedErrorMessage = `Failed to parse JSON response from ${urlBeingFetched}. The server may have returned HTML or an invalid JSON format instead of the expected EHR data. Original error: ${fetchError.message}`;
        }
        setEhrError(detailedErrorMessage);
        setPatientData(null); 
      } finally {
        setIsLoadingEhr(false);
      }
    };

    fetchPatientData();
  }, [patientIdFromUrl, API_BASE_URL]); // Use API_BASE_URL in dependency array


  // --- Rendering Logic ---

  return (
    <div className="flex flex-col gap-6"> {/* Use flex-col for better layout */}
      {/* Header and Buttons */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <RecordDetailsHeader recordName={state?.recordName || `Patient ID: ${patientIdFromUrl || 'N/A'}`} />
        <div className="flex gap-2">
          {/* Research Portal Button */}
          <button
            type="button"
            onClick={() => navigate(`/medical-records/${patientIdFromUrl}/research`)}
            className="inline-flex items-center gap-x-2 rounded-md border border-gray-200 bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 3H4C3.44772 3 3 3.44772 3 4V10C3 10.5523 3.44772 11 4 11H10C10.5523 11 11 10.5523 11 10V4C11 3.44772 10.5523 3 10 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M20 3H14C13.4477 3 13 3.44772 13 4V10C13 10.5523 13.4477 11 14 11H20C20.5523 11 21 10.5523 21 10V4C21 3.44772 20.5523 3 20 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10 13H4C3.44772 13 3 13.4477 3 14V20C3 20.5523 3.44772 21 4 21H10C10.5523 21 11 20.5523 11 20V14C11 13.4477 10.5523 13 10 13Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M17 21C19.2091 21 21 19.2091 21 17C21 14.7909 19.2091 13 17 13C14.7909 13 13 14.7909 13 17C13 19.2091 14.7909 21 17 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Research Portal
          </button>

          {/* Mutation Explorer Button */}
          <button
            type="button"
            onClick={() => navigate(`/mutation-explorer/${patientIdFromUrl}`)}
            className="inline-flex items-center gap-x-2 rounded-md border border-gray-200 bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 12C20 6.5 17 3 12 3C7 3 4 6.5 4 12C4 17.5 7 21 12 21C17 21 20 17.5 20 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4.5 9.5H19.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4.5 14.5H19.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8.5 3.5V9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M15.5 14.5V20.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M15.5 3.5V9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8.5 14.5V20.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Mutation Explorer
          </button>

          {/* Upload Report Button */}
          <button
            type="button"
            onClick={handleOpenModal}
            className="inline-flex items-center gap-x-2 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-50 dark:border-neutral-700 dark:bg-[#13131a] dark:text-white dark:hover:bg-neutral-800"
          >
            <IconFileUpload />
            Upload & Analyze Report
          </button>
        </div>
      </div>

      {/* File Upload Modal */}
      <FileUploadModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onFileChange={handleFileChange}
        onFileUpload={handleFileUpload}
        uploading={uploading}
        uploadSuccess={uploadSuccess}
        filename={filename}
      />

      {/* Analysis Result Section (from uploaded file) */}
      <div className="w-full">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            {patientIdFromUrl && (
              <p className="text-sm font-medium text-gray-700 mb-1">
                Patient ID: {patientIdFromUrl}
              </p>
            )}
            <h2 className="text-xl font-semibold text-gray-800">
              Uploaded Report Analysis
            </h2>
            <p className="text-sm text-gray-600">
              AI analysis and treatment plan based on the uploaded document/image.
            </p>
          </div>
          <div className="flex w-full flex-col px-6 py-4 text-gray-800">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Analysis Result:
              </h3>
              <div className="prose prose-sm max-w-none"> {/* Added prose styling */}
                {analysisResult ? (
                  <ReactMarkdown>{analysisResult}</ReactMarkdown>
                ) : (
                  <p className="text-sm text-gray-500">
                    {uploading ? "Analyzing..." : "Upload a report to generate analysis."}
                  </p>
                )}
              </div>
            </div>
            {analysisResult && !uploading && ( // Show button only if analysis is done and not currently uploading
              <div className="mt-5 grid gap-2 sm:flex">
                <button
                  type="button"
                  onClick={processTreatmentPlan}
                  disabled={processingKanban}
                  className="inline-flex items-center gap-x-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                >
                  Generate Treatment Tasks
                  <IconChevronRight size={20} />
                  {processingKanban && (
                    <IconProgress size={20} className="animate-spin" />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Divider */}
      <hr className="my-6 border-gray-300 dark:border-neutral-700" />

      {/* EHR Data Viewer and CoPilot Section */}
      <div className="w-full">
         <h2 className="text-xl font-semibold text-black-800 dark:text-black-200 mb-4">
            EHR Record & CoPilot
         </h2>
         {isLoadingEhr ? (
             <div className="p-4 text-center">Loading EHR data...</div>
         ) : ehrError ? (
             <div className="p-4 text-center text-red-600">Error loading EHR data: {ehrError}</div>
         ) : patientData ? (
             <>
               <AgentInsightWidget patientId={patientIdFromUrl} />
               <PatientRecordViewer patientData={patientData} />
             </>
         ) : (
             <div className="p-4 text-center text-gray-500">EHR data not available for this patient.</div>
         )}
      </div>

    </div>
  );
};

export default SingleRecordDetails;
