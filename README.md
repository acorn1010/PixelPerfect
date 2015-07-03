PixelPerfect
============

PixelPerfect is a little jQuery plugin I wrote that allows you to scale images with different algorithms, such as Nearest Neighbor.

Example usage:
```
<html>
<head>
</head>
<body>
    <canvas class="pixelperfect" data-url="http://mysite.com/myimage.png" data-scale="2" />

    <script type="text/javascript" language="javascript" src="/js/jquery.js"></script>
    <script type="text/javascript" language="javascript" src="/js/jquery.pixelperfect.js"></script>
    <script type="text/javascript" charset="utf-8">
        var pixelPerfect = new CodePeg.PixelPerfect($('canvas.pixelperfect'), {
            urlTag: 'url',
            scaleTag: 'scale',
            filter: 'nearestneighbor'
        });
    </script>
</body>
</html>
```

PixelPerfect supports arbitrary scaling on width and height. If your canvas
resizes dynamically, you can call `pixelPerfect.scale();` to re-scale the
image.
