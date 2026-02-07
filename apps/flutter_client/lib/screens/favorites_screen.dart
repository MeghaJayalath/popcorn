import 'dart:ui';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import '../models/movie.dart';
import '../services/saved_movies_service.dart';
import '../widgets/movie_poster.dart';
import 'details_screen.dart';
import '../theme/app_theme.dart';

class FavoritesScreen extends StatefulWidget {
  const FavoritesScreen({super.key});

  @override
  State<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends State<FavoritesScreen> {
  List<Movie> _favorites = [];
  final ScrollController _scrollController = ScrollController();
  double _opacity = 0.0;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    _loadFavorites();
  }

  void _onScroll() {
    final offset = _scrollController.offset;
    double newOpacity = (offset / 50).clamp(0.0, 1.0);
    if (newOpacity != _opacity) {
      setState(() => _opacity = newOpacity);
    }
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _loadFavorites() {
    setState(() {
      _favorites = SavedMoviesService().favorites;
    });
  }

  void _navigateToDetails(Movie movie) async {
    await Navigator.push(
      context,
      CupertinoPageRoute(builder: (_) => DetailsScreen(movie: movie)),
    );
    // Refresh list on return (in case item was removed)
    _loadFavorites();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        title: const Text('My List'),
        backgroundColor: Colors.transparent,
        flexibleSpace: ClipRect(
          child: BackdropFilter(
            filter: ImageFilter.blur(
              sigmaX: 15 * _opacity,
              sigmaY: 15 * _opacity,
            ),
            child: Container(color: Colors.black.withOpacity(_opacity * 0.7)),
          ),
        ),
      ),
      body: _favorites.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.favorite_border, size: 64, color: Colors.white24),
                  const SizedBox(height: 16),
                  const Text(
                    "No favorites yet",
                    style: TextStyle(color: Colors.white54, fontSize: 16),
                  ),
                ],
              ),
            )
          : GridView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.fromLTRB(
                16,
                100,
                16,
                16,
              ), // Top padding for AppBar
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 3, // 3 columns for mobile
                childAspectRatio: 0.7, // Poster ratio
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
              ),
              itemCount: _favorites.length,
              itemBuilder: (context, index) {
                final movie = _favorites[index];
                return MoviePoster(
                  movie: movie,
                  showTitle: true,
                  height: double.infinity, // Force flexible height in Grid
                  width: double.infinity,
                  onTap: () => _navigateToDetails(movie),
                );
              },
            ),
    );
  }
}
