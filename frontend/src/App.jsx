import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Inbox from "./pages/Inbox";
import Compose from "./pages/Compose";
import MessageDetail from "./pages/MessageDetail";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Default */}
        <Route
          path="/"
          element={<Navigate to="/login" />}
        />

        {/* Authentication */}
        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        {/* Mail */}
        <Route
          path="/inbox"
          element={<Inbox />}
        />

        <Route
          path="/compose"
          element={<Compose />}
        />

        {/* Message Detail */}
        <Route
          path="/message/:id"
          element={<MessageDetail />}
        />

        {/* Unknown URL */}
        <Route
          path="*"
          element={<Navigate to="/login" />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;