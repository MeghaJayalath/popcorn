import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:webview_windows/webview_windows.dart';
import 'web_player_platform_interface.dart';
import '../../services/saved_movies_service.dart';

class WebPlayerWindows extends WebPlayerPlatform {
  const WebPlayerWindows({
    super.key,
    required super.initialUrl,
    required super.onClose,
    required super.movie,
    super.season,
    super.episode,
  });

  @override
  State<WebPlayerWindows> createState() => _WebPlayerWindowsState();
}

class _WebPlayerWindowsState extends State<WebPlayerWindows> {
  final _controller = WebviewController();
  bool _initialized = false;
  int _lastUpdate = 0;
  bool _canSave = false;

  @override
  void initState() {
    super.initState();

    // Prevent overwriting history for the first 15 seconds
    Future.delayed(const Duration(seconds: 15), () {
      if (mounted) _canSave = true;
    });

    _initWebview();
  }

  Future<void> _initWebview() async {
    try {
      await _controller.initialize();
      await _controller.setBackgroundColor(Colors.transparent);
      await _controller.setPopupWindowPolicy(WebviewPopupWindowPolicy.deny);

      _controller.webMessage.listen((msg) {
        _handleMessage(msg);
      });

      // HTML Shell
      final String htmlContent =
          '''
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body, html { margin: 0; padding: 0; width: 100%; height: 100%; background-color: black; overflow: hidden; }
            iframe { width: 100%; height: 100%; border: none; }
          </style>
        </head>
        <body>
          <iframe 
            src="${widget.initialUrl}" 
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen" 
            sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
            allowfullscreen
          ></iframe>
          <script>
            // Forward messages
            window.addEventListener('message', function(e) {
               if(window.chrome && window.chrome.webview) {
                   var payload = e.data;
                   if (typeof payload === 'object') {
                      payload = JSON.stringify(payload);
                   }
                   window.chrome.webview.postMessage(payload);
               }
            });
          </script>
        </body>
        </html>
      ''';

      await _controller.loadStringContent(htmlContent);
      if (mounted) setState(() => _initialized = true);
    } catch (e) {
      print("Error creating webview: $e");
    }
  }

  void _handleMessage(dynamic msg) {
    try {
      if (msg is! String) return;
      final dynamic outerPayload = jsonDecode(msg);

      if (outerPayload is Map) {
        if (outerPayload['type'] == 'PLAYER_EVENT') {
          // It's a player event!
          final data = outerPayload['data'];
          final event = data['event'];

          if (event == 'timeupdate') {
            final double currentTime = (data['currentTime'] as num).toDouble();
            final double total = (data['duration'] as num).toDouble();

            if (total > 0) {
              final double progress = currentTime / total;
              final now = DateTime.now().millisecondsSinceEpoch;
              if (now - _lastUpdate > 5000) {
                _saveProgress(progress);
                _lastUpdate = now;
              }
            }
          } else if (event == 'pause') {
            // force save
            final double currentTime = (data['currentTime'] as num).toDouble();
            final double total = (data['duration'] as num).toDouble();
            if (total > 0) {
              _saveProgress(currentTime / total);
              _lastUpdate = DateTime.now().millisecondsSinceEpoch;
            }
          }
        }
      }
    } catch (e) {
      // Ignore errors
    }
  }

  void _saveProgress(double progress) {
    if (!_canSave) return;
    SavedMoviesService().addToHistory(
      widget.movie,
      season: widget.season,
      episode: widget.episode,
      progress: progress,
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          _initialized
              ? Webview(_controller)
              : const Center(child: CircularProgressIndicator()),
          Positioned(
            top: 10,
            left: 10,
            child: IconButton(
              icon: const Icon(Icons.arrow_back, color: Colors.white),
              onPressed: widget.onClose,
              style: IconButton.styleFrom(backgroundColor: Colors.black54),
            ),
          ),
        ],
      ),
    );
  }
}
