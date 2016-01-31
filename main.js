'use strict';

if (1 === 2) {
  var gaJsHost = (("https:" == document.location.protocol) ? "https://ssl." : "http://www.");
  document.write(unescape("%3Cscript src='" + gaJsHost + "google-analytics.com/ga.js' type='text/javascript'%3E%3C/script%3E"));

  try {
    var pageTracker = _gat._getTracker("UA-73109746-1");
    pageTracker._trackPageview();
  } catch(err) {

  }
}

$(document).ready(function() {

  function onFeatureSelect(id) {
    $('.feature-header .btn').removeClass('active');
    $('.sample-code pre').css('display', 'none');
    $('#source-' + id).css('display', 'block');
    $('#' + id).addClass('active');
    execScript(scripts[id] || scripts['feature1']);
  }

  $('.feature-header .btn').click(function (e) {
    var id = $(e.currentTarget).attr('id');
    onFeatureSelect(id);
  });

  onFeatureSelect('feature1');

});
