# encoding: utf-8

Spec = Gem::Specification.new do |s|

  s.required_ruby_version = '>= 1.8.1'

  s.platform    = Gem::Platform::RUBY
  s.name        = 'achoo-plugin-homescreen'
  s.version     = '0.1'
  s.summary     = 'A homescreen plugin for Achoo.'
  s.description = 'FIX'
  s.homepage    = 'http://github.com/kjellm/achoo-plugin-homescreen'
  s.author      = 'Kjell-Magne Øierud'
  s.email       = 'kjellm@acm.org'

  s.add_dependency('achoo', '>= 0.5.0')
  s.requirements << 'none'

  s.files = Dir.glob('lib/**/*.rb') + 
    %w(CHANGES Rakefile README.md COPYING)
end

