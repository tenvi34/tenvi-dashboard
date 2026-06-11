function PhotoCollectionSelect({ collections, onChange, t, value }) {
  return (
    <label className="map-field">
      <span>{t.map.collectionField}</span>
      <select
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value || null)}
      >
        <option value="">{t.map.unassignedCollection}</option>
        {collections.map((collection) => (
          <option key={collection.id} value={collection.id}>
            {collection.name}
          </option>
        ))}
      </select>
    </label>
  )
}

export default PhotoCollectionSelect
