import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./login/Login";
import Dashboard from "./dashboard/Dashboard";
import AddUsers from "./addusers/AddUsers";
import ActivateAccount from "./activateaccount/ActivateAccount";
import Upload from "./upload/Upload";
import Documents from "./documents/Documents";
import AssignmentDetail from "./assignmentdetail/AssignmentDetail";
import Sign from "./sign/Sign";
import ProtectedRoute from "./routes/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Login />} />
        <Route path="/activate-account" element={<ActivateAccount />} />

        {/* Any logged-in user */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/documents"
          element={
            <ProtectedRoute>
              <Documents />
            </ProtectedRoute>
          }
        />
        <Route
          path="/documents/:assignmentId"
          element={
            <ProtectedRoute>
              <AssignmentDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/documents/:assignmentId/sign/:documentId"
          element={
            <ProtectedRoute>
              <Sign />
            </ProtectedRoute>
          }
        />

        {/* Admin only */}
        <Route
          path="/admin/add-user"
          element={
            <ProtectedRoute requireRole="admin">
              <AddUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/upload"
          element={
            <ProtectedRoute requireRole="admin">
              <Upload />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;