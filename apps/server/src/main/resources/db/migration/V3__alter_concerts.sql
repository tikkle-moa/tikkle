ALTER TABLE concerts
    ADD COLUMN genre ENUM(
    'BALLAD',
    'ROCK_METAL',
    'RAP_HIPHOP',
    'JAZZ_SOUL',
    'TROT',
    'INTERNATIONAL_ARTIST',
    'FESTIVAL',
    'INDIE'
) NOT NULL AFTER title;