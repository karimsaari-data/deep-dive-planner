interface ParticipantPhotoFrameProps {
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
}

const ParticipantPhotoFrame = ({ firstName, lastName, avatarUrl }: ParticipantPhotoFrameProps) => {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  return (
    <div className="w-full aspect-[4/5] overflow-hidden rounded-2xl bg-primary/10">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={`${firstName} ${lastName}`}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <span className="text-5xl font-bold text-primary">{initials}</span>
        </div>
      )}
    </div>
  );
};

export default ParticipantPhotoFrame;
