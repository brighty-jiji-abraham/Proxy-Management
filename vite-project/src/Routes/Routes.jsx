import { Navigate, Route } from "react-router-dom";
import Dashboard from "../Components/Dashboard";
import Backends from "../Components/Backends";
import Tunnel from "../Components/Tunnel";
import Ollama from "../Components/Ollama";
import CallHistory from "../Components/CallHistory";
import GenerateAPIkey from "../Components/GenerateAPIkey";
import ListAPIkey from "../Components/ListAPIkey";

// Two entries previously shared key="dashboard", which React uses to tell
// siblings apart - duplicated keys make reconciliation unpredictable.
export const routes = [
    <Route key="dashboard" path="/dashboard" element={<Dashboard />} />,
    <Route key="backends" path="/backends" element={<Backends />} />,
    <Route key="tunnel" path="/tunnel" element={<Tunnel />} />,
    <Route key="ollama" path="/ollama" element={<Ollama />} />,
    <Route key="calls" path="/calls" element={<CallHistory />} />,
    <Route key="generate-key" path="/generate-key" element={<GenerateAPIkey />} />,
    <Route key="list-keys" path="/list-keys" element={<ListAPIkey />} />,
    // Catch-all last: a wildcard declared first would shadow every route
    // below it in this array.
    <Route key="fallback" path="*" element={<Navigate to="/dashboard" replace />} />,
]
