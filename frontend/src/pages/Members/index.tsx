import { Routes, Route } from 'react-router-dom';
import MemberList from './MemberList';
import MemberForm from './MemberForm';
import MemberDetail from './MemberDetail';

const Members: React.FC = () => {
  return (
    <Routes>
      <Route index element={<MemberList />} />
      <Route path="add" element={<MemberForm mode="add" />} />
      <Route path=":id" element={<MemberDetail />} />
      <Route path=":id/edit" element={<MemberForm mode="edit" />} />
    </Routes>
  );
};

export default Members;
