import { useConcertList } from "../model/use-concert-list";

const ConcertListPage = () => {
  const { concerts, handleNewConcert, handleRemoveConcert } = useConcertList();

  return (
    <div>
      <h1>Concert List</h1>
      <ul>
        {concerts.map((concert, index) => (
          <li key={index}>
            {concert} <button onClick={() => handleRemoveConcert(concert)}>Remove</button>
          </li>
        ))}
      </ul>
      <button onClick={() => handleNewConcert(`Concert ${concerts.length + 1}`)}>Add Concert</button>
    </div>
  );
};

export default ConcertListPage;
