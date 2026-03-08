# coding: utf-8
lib = File.expand_path('../lib', __FILE__)
$LOAD_PATH.unshift(lib) unless $LOAD_PATH.include?(lib)
require 'sg/version'

Gem::Specification.new do |spec|
  spec.name          = 'sg'
  spec.version       = Sg::VERSION
  spec.authors       = ['Wataru Sato']
  spec.email         = ['awwa500@gmail.com']

  spec.summary       = 'Call SendGrid API v3 from the command line interface.'
  spec.description   = 'Call SendGrid API v3 from the command line interface.'
  spec.homepage      = 'https://github.com/awwa/sg/'
  spec.license       = 'MIT'

  spec.files = `git ls-files -z`.split("\x0").reject do |f|
    f.match(%r{^(test|spec|features)/})
  end
  spec.bindir        = 'exe'
  spec.executables   = spec.files.grep(%r{^exe/}) { |f| File.basename(f) }
  spec.require_paths = ['lib']

  spec.add_dependency('thor', '~> 0.19')
  spec.add_dependency('sendgrid-ruby', '~> 4.3.0')

  spec.add_development_dependency('rubocop', '~>0.48')
  spec.add_development_dependency('bundler', '~> 1.14')
  spec.add_development_dependency('rake', '~> 12')
  spec.add_development_dependency('rspec', '~> 3.5')
end
