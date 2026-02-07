import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import '../models/movie.dart';
import '../theme/app_theme.dart';

class MoviePoster extends StatelessWidget {
  final Movie movie;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;
  final double width;
  final double height;
  final String? heroTag;
  final bool showTitle;

  const MoviePoster({
    super.key,
    required this.movie,
    this.onTap,
    this.onLongPress,
    this.width = 120,
    this.height = 180,
    this.showTitle = false,
    this.heroTag,
  });

  @override
  Widget build(BuildContext context) {
    Widget imageContent = Hero(
      tag: heroTag ?? 'movie_${movie.id}',
      child: Container(
        width: width == double.infinity ? double.infinity : width,
        height: height == double.infinity ? double.infinity : height,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(8),
          boxShadow: const [
            BoxShadow(
              color: Colors.black45,
              blurRadius: 8,
              offset: Offset(0, 4),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          fit: StackFit.expand,
          children: [
            (movie.posterUrl != null && movie.posterUrl!.isNotEmpty)
                ? (movie.posterUrl!.toLowerCase().endsWith('.svg')
                      ? SvgPicture.network(
                          movie.posterUrl!,
                          fit: BoxFit.cover,
                          alignment: Alignment.center,
                          placeholderBuilder: (context) => Shimmer.fromColors(
                            baseColor: Colors.grey[900]!,
                            highlightColor: Colors.grey[800]!,
                            child: Container(color: Colors.black),
                          ),
                        )
                      : CachedNetworkImage(
                          imageUrl: movie.posterUrl!,
                          fit: BoxFit.cover,
                          alignment: Alignment.center,
                          // Multiply by 1.5 to ensure sharpness (supersample slightly)
                          memCacheHeight:
                              ((height == double.infinity ? 400 : height) *
                                      MediaQuery.of(context).devicePixelRatio *
                                      1.5)
                                  .toInt(),
                          placeholder: (context, url) => Shimmer.fromColors(
                            baseColor: Colors.grey[900]!,
                            highlightColor: Colors.grey[800]!,
                            child: Container(color: Colors.black),
                          ),
                          errorWidget: (context, url, error) => Container(
                            color: Colors.grey[900],
                            child: const Center(
                              child: Icon(
                                Icons.broken_image,
                                color: Colors.white24,
                              ),
                            ),
                          ),
                        ))
                : Container(
                    color: Colors.grey[900],
                    child: const Center(
                      child: Icon(Icons.movie, color: Colors.white24),
                    ),
                  ),
            // History Badge (S1 E1)
            if (movie.currentSeason != null && movie.currentEpisode != null)
              Positioned(
                bottom: 8,
                right: 8,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 6,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.8),
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(color: Colors.white24, width: 0.5),
                  ),
                  child: Text(
                    'S${movie.currentSeason} E${movie.currentEpisode}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),

            // Progress Bar
            if (movie.progress != null && movie.progress! > 0)
              Positioned(
                bottom: 0,
                left: 0,
                right: 0,
                child: LinearProgressIndicator(
                  value: movie.progress,
                  backgroundColor: Colors.white10,
                  valueColor: const AlwaysStoppedAnimation<Color>(
                    AppTheme.primaryColor,
                  ),
                  minHeight: 3,
                ),
              ),
          ],
        ),
      ),
    );

    // If height is infinite (e.g. in GridView), we want the image to take available space
    // minus the text height.
    if (height == double.infinity) {
      imageContent = Expanded(child: imageContent);
    }

    if (!showTitle)
      return GestureDetector(
        onTap: onTap,
        onLongPress: onLongPress,
        child: imageContent,
      );

    return GestureDetector(
      onTap: onTap,
      onLongPress: onLongPress,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          imageContent,
          if (showTitle) ...[
            const SizedBox(height: 8),
            SizedBox(
              width: width == double.infinity ? null : width,
              child: Text(
                movie.title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: Colors.white70,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
