import { createContext , useContext ,useState,ReactNode} from "react";
interface User{
    _id:string;
    name:string;
    username:string
}
interface SelectedUserContextType{
    selectedUser: User | null;
  setSelectedUser: (user: User | null) => void;
}
const SelectedUserContext = createContext<SelectedUserContextType | undefined>(undefined);


export const SelectedUserProvider = ({ children }: { children: ReactNode }) => {
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
    return (
      <SelectedUserContext.Provider value={{ selectedUser, setSelectedUser }}>
        {children}
      </SelectedUserContext.Provider>
    );
  };

  export const useSelectedUser = () => {
    const context = useContext(SelectedUserContext);
    if (!context) {
      throw new Error("useSelectedUser must be used within SelectedUserProvider");
    }
    return context;
  };