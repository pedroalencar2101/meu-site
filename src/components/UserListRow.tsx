import UserListCard from './UserListCard';

type Props = {
  uid: string;
  hint?: string;
  viewerId?: string;
  showFollow?: boolean;
};

/** Linha de utilizador (compat.) — usa UserListCard com avatar. */
export default function UserListRow({ uid, hint, viewerId, showFollow }: Props) {
  return (
    <UserListCard
      uid={uid}
      subtitle={hint}
      viewerId={viewerId}
      showFollow={showFollow}
      showChevron={!showFollow}
    />
  );
}
