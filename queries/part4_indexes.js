const database = db.getSiblingDB("spotify");

function printExecutionStats(title, explainResult) {
  print(`\n${title}`);
  printjson({
    executionSuccess: explainResult.executionStats.executionSuccess,
    nReturned: explainResult.executionStats.nReturned,
    totalKeysExamined: explainResult.executionStats.totalKeysExamined,
    totalDocsExamined: explainResult.executionStats.totalDocsExamined,
    executionTimeMillis: explainResult.executionStats.executionTimeMillis,
    winningPlan: explainResult.queryPlanner.winningPlan
  });
}

function dropIndexIfExists(indexName) {
  const exists = database.tracks.getIndexes().some((index) => index.name === indexName);
  if (exists) {
    database.tracks.dropIndex(indexName);
  }
}

const danceabilityIndexName = "idx_genre_danceability_popularity";
const workMusicIndexName = "idx_work_music";

const danceabilityQuery = {
  track_genre: "pop",
  "audio_features.danceability": { $gte: 0.7 }
};

dropIndexIfExists(danceabilityIndexName);

printExecutionStats(
  "Task 1. Before creating index",
  database.tracks.find(danceabilityQuery).sort({ popularity: -1 }).explain("executionStats")
);

database.tracks.createIndex(
  {
    track_genre: 1,
    "audio_features.danceability": 1,
    popularity: -1
  },
  { name: danceabilityIndexName }
);

printExecutionStats(
  "Task 1. After creating index",
  database.tracks.find(danceabilityQuery).sort({ popularity: -1 }).explain("executionStats")
);

const workMusicQuery = {
  "audio_features.instrumentalness": { $gt: 0.5 },
  "audio_features.speechiness": { $lt: 0.1 },
  explicit: false
};

dropIndexIfExists(workMusicIndexName);

printExecutionStats(
  "Task 2. Before creating work-music index",
  database.tracks.find(workMusicQuery).explain("executionStats")
);

database.tracks.createIndex(
  {
    explicit: 1,
    "audio_features.instrumentalness": 1,
    "audio_features.speechiness": 1
  },
  { name: workMusicIndexName }
);

printExecutionStats(
  "Task 2. After creating work-music index",
  database.tracks.find(workMusicQuery).explain("executionStats")
);

print("\nTask 3. Covered query check");
print("Existing Task 1 index:");
printjson(database.tracks.getIndexes().filter((index) => index.name === danceabilityIndexName));

print("Original query is not covered because it returns full documents and the index does not contain every returned field.");
print("A covered version must project only indexed fields and exclude _id:");
printjson(
  database.tracks.find(
    {
      track_genre: "pop",
      popularity: { $gte: 70 }
    },
    {
      _id: 0,
      track_genre: 1,
      popularity: 1
    }
  ).explain("executionStats")
);
