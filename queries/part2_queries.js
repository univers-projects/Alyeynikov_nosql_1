const database = db.getSiblingDB("spotify");

print("\nTask 2. Popular artists whose all tracks are popular");
printjson(
  database.tracks.aggregate([
    { $unwind: "$artists" },
    {
      $group: {
        _id: "$artists",
        track_count: { $sum: 1 },
        min_popularity: { $min: "$popularity" },
        avg_popularity: { $avg: "$popularity" }
      }
    },
    {
      $match: {
        track_count: { $gte: 3 },
        min_popularity: { $gte: 60 }
      }
    },
    {
      $project: {
        _id: 0,
        artist: "$_id",
        track_count: 1,
        min_popularity: 1,
        avg_popularity: { $round: ["$avg_popularity", 1] }
      }
    },
    { $sort: { avg_popularity: -1, min_popularity: -1, track_count: -1, artist: 1 } },
    { $limit: 20 }
  ]).toArray()
);

print("\nTask 3. Tempo outliers by genre");
printjson(
  database.tracks.aggregate([
    {
      $group: {
        _id: "$track_genre",
        avg_tempo: { $avg: "$audio_features.tempo" },
        std_tempo: { $stdDevPop: "$audio_features.tempo" },
        tracks: {
          $push: {
            _id: "$_id",
            track_name: "$track_name",
            popularity: "$popularity",
            artists: "$artists",
            audio_features: { tempo: "$audio_features.tempo" }
          }
        }
      }
    },
    {
      $set: {
        genre: "$_id",
        outlier_threshold: { $add: ["$avg_tempo", { $multiply: [2, "$std_tempo"] }] }
      }
    },
    {
      $set: {
        outlier_tracks: {
          $filter: {
            input: "$tracks",
            as: "track",
            cond: { $gt: ["$$track.audio_features.tempo", "$outlier_threshold"] }
          }
        }
      }
    },
    { $match: { "outlier_tracks.0": { $exists: true } } },
    {
      $project: {
        _id: 0,
        genre: 1,
        avg_tempo: { $round: ["$avg_tempo", 1] },
        outlier_threshold: { $round: ["$outlier_threshold", 1] },
        outlier_tracks: 1
      }
    },
    { $sort: { genre: 1 } }
  ]).toArray()
);

print("\nTask 4. Background work tracks");
printjson(
  database.tracks.find(
    {
      "audio_features.loudness": { $lt: -10 },
      "audio_features.speechiness": { $lt: 0.1 },
      "audio_features.instrumentalness": { $gt: 0.5 },
      explicit: false
    },
    {
      _id: 0,
      track_name: 1,
      artists: 1,
      track_genre: 1,
      popularity: 1,
      duration_sec: 1,
      "audio_features.loudness": 1,
      "audio_features.speechiness": 1,
      "audio_features.instrumentalness": 1
    }
  ).sort({ popularity: -1, track_name: 1 }).limit(50).toArray()
);
