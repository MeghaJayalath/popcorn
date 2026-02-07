import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/movie.dart';

class SavedMoviesService {
  static const String _favoritesKey = 'favorites_v1';
  static const String _historyKey = 'watch_history_v1';
  static const String _episodeHistoryKey = 'episode_history_v1';

  // Singleton
  static final SavedMoviesService _instance = SavedMoviesService._internal();
  factory SavedMoviesService() => _instance;
  SavedMoviesService._internal();

  List<Movie> _favorites = [];
  Map<String, dynamic> _history =
      {}; // { id: { progress: 0.5, last_watched: ms } }
  Map<String, dynamic> _episodeHistory = {}; // { 'movieId_s_e': progress }

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();

    // Load Favorites
    final favJson = prefs.getString(_favoritesKey);
    if (favJson != null) {
      try {
        final List<dynamic> decoded = jsonDecode(favJson);
        _favorites = decoded.map((e) => Movie.fromStorageJson(e)).toList();
      } catch (e) {
        print("Error loading favorites: $e");
      }
    }

    // Load History
    final historyJson = prefs.getString(_historyKey);
    if (historyJson != null) {
      try {
        final Map<String, dynamic> decoded = jsonDecode(historyJson);
        _history = decoded;
      } catch (e) {
        print("Error loading history: $e");
      }
    }

    // Load Episode History
    final epHistoryJson = prefs.getString(_episodeHistoryKey);
    if (epHistoryJson != null) {
      try {
        final Map<String, dynamic> decoded = jsonDecode(epHistoryJson);
        _episodeHistory = decoded;
      } catch (e) {
        print("Error loading episode history: $e");
      }
    }
  }

  // --- Favorites API ---

  List<Movie> get favorites => List.unmodifiable(_favorites);

  bool isFavorite(String id) {
    return _favorites.any((m) => m.id == id);
  }

  Movie? getMovieFromHistory(String id) {
    if (_history.containsKey(id)) {
      try {
        return Movie.fromStorageJson(_history[id]['movie']);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  double? getEpisodeProgress(String movieId, int season, int episode) {
    final key = '${movieId}_${season}_$episode';
    if (_episodeHistory.containsKey(key)) {
      return (_episodeHistory[key] as num).toDouble();
    }
    return null;
  }

  Future<void> toggleFavorite(Movie movie) async {
    if (isFavorite(movie.id)) {
      _favorites.removeWhere((m) => m.id == movie.id);
    } else {
      _favorites.add(movie);
    }
    await _saveFavorites();
  }

  Future<void> _saveFavorites() async {
    final prefs = await SharedPreferences.getInstance();
    final encoded = jsonEncode(
      _favorites.map((m) => m.toStorageJson()).toList(),
    );
    await prefs.setString(_favoritesKey, encoded);
  }

  // --- History API ---

  List<Movie> get history {
    // Return movies sorted by last_watched (descending)
    final entries = _history.entries.toList();
    entries.sort((a, b) {
      final tA = a.value['last_watched'] as int? ?? 0;
      final tB = b.value['last_watched'] as int? ?? 0;
      return tB.compareTo(tA);
    });

    return entries.map((e) {
      final movieJson = e.value['movie'];
      return Movie.fromStorageJson(movieJson);
    }).toList();
  }

  Future<void> addToHistory(
    Movie movie, {
    int? season,
    int? episode,
    double? progress,
  }) async {
    // Create a copy of the movie with updated history data if provided
    final movieToSave = Movie(
      id: movie.id,
      title: movie.title,
      year: movie.year,
      image: movie.image,
      backdrop: movie.backdrop,
      rating: movie.rating,
      voteCount: movie.voteCount,
      description: movie.description,
      type: movie.type,
      inCinemas: movie.inCinemas,
      director: movie.director,
      cast: movie.cast,
      genres: movie.genres,
      logoUrl: movie.logoUrl,
      runtime: movie.runtime,
      mpaa: movie.mpaa,
      certification: movie.certification,
      seasons: movie.seasons,
      trailerUrl: movie.trailerUrl,
      imdbId: movie.imdbId,
      // Update history fields
      currentSeason: season ?? movie.currentSeason,
      currentEpisode: episode ?? movie.currentEpisode,
      progress: progress ?? movie.progress,
    );

    _history[movie.id] = {
      'movie': movieToSave.toStorageJson(),
      'last_watched': DateTime.now().millisecondsSinceEpoch,
    };

    // Save specific episode progress
    if (season != null && episode != null && progress != null) {
      _episodeHistory['${movie.id}_${season}_$episode'] = progress;
      await _saveEpisodeHistory();
    }

    await _saveHistory();
  }

  Future<void> removeFromHistory(String movieId) async {
    if (_history.containsKey(movieId)) {
      _history.remove(movieId);
      await _saveHistory();

      // Clear associated episode history
      _episodeHistory.removeWhere((key, _) => key.startsWith('${movieId}_'));
      await _saveEpisodeHistory();
    }
  }

  Future<void> _saveHistory() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_historyKey, jsonEncode(_history));
  }

  Future<void> _saveEpisodeHistory() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_episodeHistoryKey, jsonEncode(_episodeHistory));
  }
}
