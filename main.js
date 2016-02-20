'use strict';

if (String(window.location).indexOf('test') === -1) {
  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','//www.google-analytics.com/analytics.js','ga');

  ga('create', 'UA-73109746-1', 'auto');
  ga('send', 'pageview');
} else {
  ga = function () {};
}

$(document).ready(function() {

  function onFeatureSelect(id, pageLoad) {
    $('.feature-header .btn').removeClass('active');
    $('.sample-code pre').css('display', 'none');
    $('.feature-description > div > div > div').css('display', 'none');
    $('#source-' + id).css('display', 'block');
    $('#description-' + id).css('display', 'block');
    $('#' + id).addClass('active');
    execScript(scripts[id] || scripts['feature1']);
    if (pageLoad === undefined) {
      ga('send', 'event', 'try-it-out', 'select', 'try-it-out', id);
    }
  }

  var scrolls = {}
  $(window).on('scroll', function () {
    if ($(window).scrollTop() + $(window).height() >= $(document).height()) {
      if (scrolls.bottom === undefined) {
        scrolls.bottom = true;
        ga('send', 'event', 'scroll', 'scroll', 'scroll-bottom', 'true');
      }
    }
  });

  $('.feature-header .btn').click(function (e) {
    var id = $(e.currentTarget).attr('id');
    onFeatureSelect(id);
  });

  onFeatureSelect('feature1', true);

  $(function() {
    $('a[href*="#"]:not([href="#"])').click(function() {
      if (location.pathname.replace(/^\//,'') == this.pathname.replace(/^\//,'') && location.hostname == this.hostname) {
        var target = $(this.hash);
        target = target.length ? target : $('[name=' + this.hash.slice(1) +']');
        if (target.length) {
          console.log('OK...')
          $('html, body').animate({
            scrollTop: target.offset().top
          }, 1000);
          return false;
        }
      }
    });
  });
});

