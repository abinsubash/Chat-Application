import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Chatpge from "./pages/Chatpge";
import { Provider } from "react-redux";
import store from "./store/store";
import { PersistGate } from "redux-persist/integration/react";
import { persistor } from "./store/persist";
import ProtectedRoute from "./router/protectedRouter";
import { SocketProvider } from "./context/SocketContext";
import { SelectedUserProvider } from "@/context/SelectedUserContext";

function App() {
  return (
    <BrowserRouter>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <SocketProvider>
            <Routes>
              <Route
                path="/"
                element={
                  <ProtectedRoute authRequired={false}>
                    <Login />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/signup"
                element={
                  <ProtectedRoute authRequired={false}>
                    <Signup />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chat"
                element={
                  <ProtectedRoute>
                    <SelectedUserProvider>
                      <Chatpge />
                    </SelectedUserProvider>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </SocketProvider>
        </PersistGate>
      </Provider>
    </BrowserRouter>
  );
}

export default App;
