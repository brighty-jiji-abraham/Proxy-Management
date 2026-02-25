import { Navigate, Route } from "react-router-dom";
import GenerateAPIkey from "../Components/GenerateAPIkey";
import Dashboard from "../Components/Dashboard";
import ListAPIkey from "../Components/ListAPIkey";


export const routes = [
    <Route key="dashboard" path="*" element={<Navigate to="/dashboard" />} />,
    <Route key="dashboard" path="/dashboard" element={<Dashboard />} />,
    <Route key="generate-key" path="/generate-key" element={<GenerateAPIkey />} />,
    <Route key="list-keys" path="/list-keys" element={<ListAPIkey />} />
]