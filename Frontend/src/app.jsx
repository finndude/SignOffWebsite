import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./login/login";
import ForgotPassword from "./forgotpassword/ForgotPassword";
import ResetPassword from "./resetpassword/ResetPassword";
import Dashboard from "./dashboard/dashboard";
import AddUsers from "./addusers/addusers";
import ActivateAccount from "./activateaccount/activateaccount";
import Upload from "./upload/upload";
import AdminAssignments from "./adminassignments/adminassignments";
import Documents from "./documents/documents";
import AssignmentDetail from "./assignmentdetail/assignmentdetail";
import Sign from "./sign/sign";
import ProtectedRoute from "./routes/protectedroute";
import DocumentViewer from "./documentviewer/documentviewer";
import ManageUsers from "./manageusers/manageusers";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Login />} />
        <Route path="/activate-account" element={<ActivateAccount />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

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

        <Route
          path="/documents/:assignmentId/view/:documentId"
          element={
            <ProtectedRoute>
              <DocumentViewer />
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
        <Route
          path="/admin/assignments"
          element={
            <ProtectedRoute requireRole="admin">
              <AdminAssignments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute requireRole="admin">
              <ManageUsers />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
