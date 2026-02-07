class ScraperService {
  // VidKing URL Generation
  String getEmbedUrl(
    String tmdbId, {
    int? season,
    int? episode,
    String? imdbId,
    String provider = 'vidking',
  }) {
    final primaryColor = 'FDEDAD'; // Match existing app theme

    if (provider == 'vidsrc') {
      final idParam = imdbId != null ? 'imdb=$imdbId' : 'tmdb=$tmdbId';
      if (season != null && episode != null) {
        return 'https://vidsrc.xyz/embed/tv?$idParam&season=$season&episode=$episode';
      }
      return 'https://vidsrc.xyz/embed/movie?$idParam';
    }

    // Default: VidKing
    // VidKing also supports IMDB: https://vidking.net/embed/imdb/{imdb_id}
    // Prefer IMDB if available for better mapping accuracy
    if (imdbId != null && (season == null || episode == null)) {
      // Logic for movie with IMDB
      return 'https://vidking.net/embed/imdb/$imdbId?color=$primaryColor';
    }

    // Fallback to TMDB
    if (season != null && episode != null) {
      return 'https://vidking.net/embed/tv/$tmdbId/$season/$episode?color=$primaryColor';
    }
    return 'https://vidking.net/embed/movie/$tmdbId?color=$primaryColor';
  }

  // Legacy Future for backward compat if needed, but we prefer direct String for embeds
  Future<String?> getStreamUrl(String query) async {
    // Phase 1 Stub - kept for reference
    return 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
  }
}
