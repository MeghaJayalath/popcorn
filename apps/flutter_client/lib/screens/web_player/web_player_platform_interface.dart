import 'package:flutter/material.dart';
import '../../models/movie.dart';

abstract class WebPlayerPlatform extends StatefulWidget {
  final String initialUrl;
  final VoidCallback onClose;
  final Movie movie;
  final int? season;
  final int? episode;

  const WebPlayerPlatform({
    super.key,
    required this.initialUrl,
    required this.onClose,
    required this.movie,
    this.season,
    this.episode,
  });
}
